import { NextResponse } from "next/server";
import { getImportedGmailMessageIds } from "@/lib/db";
import { mockExtract } from "@/lib/mockExtractor";
import {
  detectPreviewCategory,
  fetchGmailMessagePreview,
  listRecruitingMessages,
  mapGmailRequests,
  type GmailScanRange,
} from "@/lib/google/gmail";
import { getValidGoogleAccessToken } from "@/lib/google/oauth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { range = "7d", customQuery } = body as {
      range?: GmailScanRange;
      customQuery?: string;
    };

    const accessToken = await getValidGoogleAccessToken();
    const importedIds = await getImportedGmailMessageIds();
    const listed = await listRecruitingMessages(accessToken, {
      range,
      customQuery,
      maxResults: 20,
    });

    // Gmail limits concurrent requests per user — fetch one at a time.
    const messages = await mapGmailRequests(listed, async (item) => {
      const parsed = await fetchGmailMessagePreview(accessToken, item.id);
      const previewText = `${parsed.subject ?? ""}\n${parsed.snippet ?? ""}`;
      const heuristic = mockExtract(previewText);

      return {
        id: parsed.id,
        threadId: parsed.threadId,
        subject: parsed.subject,
        senderName: parsed.senderName,
        senderEmail: parsed.senderEmail,
        snippet: parsed.snippet,
        receivedAt: parsed.receivedAt,
        alreadyImported: importedIds.has(parsed.id),
        previewCategory: detectPreviewCategory(parsed.subject, parsed.snippet),
        previewCompany: heuristic.company,
        previewStage: heuristic.stage,
      };
    });

    return NextResponse.json({
      count: messages.length,
      messages,
    });
  } catch (err) {
    const raw =
      err instanceof Error ? err.message : "Failed to scan Gmail";
    const message = raw.includes("Too many concurrent requests")
      ? "Gmail rate limit hit. Wait a few seconds and try Scan again."
      : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
