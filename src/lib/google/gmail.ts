import { RECRUITING_GMAIL_QUERY } from "./config";

export type GmailScanRange = "7d" | "30d" | "unread" | "custom";

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageListItem {
  id: string;
  threadId?: string;
}

interface GmailMessageListResponse {
  messages?: GmailMessageListItem[];
  resultSizeEstimate?: number;
}

interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

interface GmailMessageResponse {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
}

export interface ParsedGmailMessage {
  id: string;
  threadId: string | null;
  subject: string | null;
  senderName: string | null;
  senderEmail: string | null;
  snippet: string | null;
  body: string;
  receivedAt: string | null;
}

export interface GmailPreviewMessage extends ParsedGmailMessage {
  alreadyImported: boolean;
  previewCategory: string | null;
  previewCompany: string | null;
  previewStage: string | null;
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string | null {
  const match = headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return match?.value ?? null;
}

function parseSender(from: string | null): {
  name: string | null;
  email: string | null;
} {
  if (!from) return { name: null, email: null };
  const match = from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/);
  if (!match) return { name: from, email: null };
  return {
    name: match[1]?.trim() || null,
    email: match[2]?.trim() || null,
  };
}

function collectTextFromPart(part: GmailMessagePart): {
  plain: string[];
  html: string[];
} {
  const plain: string[] = [];
  const html: string[] = [];

  if (part.mimeType === "text/plain" && part.body?.data) {
    plain.push(decodeBase64Url(part.body.data));
  } else if (part.mimeType === "text/html" && part.body?.data) {
    html.push(decodeBase64Url(part.body.data));
  }

  for (const child of part.parts ?? []) {
    const nested = collectTextFromPart(child);
    plain.push(...nested.plain);
    html.push(...nested.html);
  }

  return { plain, html };
}

function extractPlainTextFromPayload(
  payload: GmailMessageResponse["payload"]
): string {
  if (!payload) return "";

  if (payload.parts?.length) {
    const plain: string[] = [];
    const html: string[] = [];
    for (const part of payload.parts) {
      const collected = collectTextFromPart(part);
      plain.push(...collected.plain);
      html.push(...collected.html);
    }
    if (plain.length > 0) {
      return plain.join("\n\n").trim();
    }
    if (html.length > 0) {
      return stripHtml(html.join("\n\n"));
    }
  }

  if (payload.body?.data) {
    const raw = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html" || looksLikeHtml(raw)) {
      return stripHtml(raw);
    }
    return raw.trim();
  }

  return "";
}

function looksLikeHtml(text: string): boolean {
  return /^\s*</.test(text) || /<!DOCTYPE/i.test(text);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

export { stripHtml as stripHtmlToPlainText };

export function parseGmailMessage(raw: GmailMessageResponse): ParsedGmailMessage {
  const headers = raw.payload?.headers;
  const from = getHeader(headers, "From");
  const { name, email } = parseSender(from);
  const subject = getHeader(headers, "Subject");

  let body = extractPlainTextFromPayload(raw.payload);

  if (!body.trim()) {
    body = raw.snippet ?? subject ?? "(No message body)";
  }

  const receivedAt = raw.internalDate
    ? new Date(Number(raw.internalDate)).toISOString()
    : null;

  return {
    id: raw.id,
    threadId: raw.threadId ?? null,
    subject,
    senderName: name,
    senderEmail: email,
    snippet: raw.snippet ?? null,
    body: body.trim(),
    receivedAt,
  };
}

export function buildGmailSearchQuery(
  range: GmailScanRange,
  customQuery?: string
): string {
  const parts = [RECRUITING_GMAIL_QUERY];

  if (range === "7d") parts.push("newer_than:7d");
  if (range === "30d") parts.push("newer_than:30d");
  if (range === "unread") parts.push("is:unread");
  if (range === "custom" && customQuery?.trim()) {
    parts.push(customQuery.trim());
  }

  return parts.join(" ");
}

async function gmailFetch<T>(
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value)
    );
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gmail API error (${res.status})`);
  }

  return data;
}

const METADATA_HEADERS = ["From", "Subject", "Date"];

export async function fetchGmailMessagePreview(
  accessToken: string,
  messageId: string
): Promise<ParsedGmailMessage> {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`
  );
  url.searchParams.set("format", "metadata");
  for (const header of METADATA_HEADERS) {
    url.searchParams.append("metadataHeaders", header);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const raw = (await res.json()) as GmailMessageResponse & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(raw.error?.message ?? `Gmail API error (${res.status})`);
  }

  return parseGmailMessage(raw);
}

export async function mapGmailRequests<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  delayMs = 150
): Promise<R[]> {
  const results: R[] = [];
  for (const item of items) {
    results.push(await fn(item));
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

export async function listRecruitingMessages(
  accessToken: string,
  options: {
    range: GmailScanRange;
    customQuery?: string;
    maxResults?: number;
  }
): Promise<GmailMessageListItem[]> {
  const q = buildGmailSearchQuery(options.range, options.customQuery);
  const data = await gmailFetch<GmailMessageListResponse>(
    accessToken,
    "/messages",
    {
      q,
      maxResults: String(options.maxResults ?? 20),
    }
  );

  return data.messages ?? [];
}

export async function fetchGmailMessage(
  accessToken: string,
  messageId: string
): Promise<ParsedGmailMessage> {
  const raw = await gmailFetch<GmailMessageResponse>(
    accessToken,
    `/messages/${messageId}`,
    { format: "full" }
  );

  return parseGmailMessage(raw);
}

export function detectPreviewCategory(
  subject: string | null,
  snippet: string | null
): string {
  const text = `${subject ?? ""} ${snippet ?? ""}`.toLowerCase();
  if (/reject|not moving forward|unfortunately/.test(text)) return "Rejection";
  if (/offer|congratulations/.test(text)) return "Offer";
  if (/online assessment|coding challenge|hackerrank|codesignal|\boa\b/.test(text))
    return "Online assessment";
  if (/interview|schedule|availability|calendar/.test(text))
    return "Interview / scheduling";
  if (/recruiter|internship|application|new grad/.test(text))
    return "Recruiting outreach";
  return "Other recruiting";
}
