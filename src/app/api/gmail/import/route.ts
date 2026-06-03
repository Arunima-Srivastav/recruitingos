import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { extractRecruitingMessage } from "@/lib/ai/extract";
import { fetchGmailMessage } from "@/lib/google/gmail";
import { getValidGoogleAccessToken } from "@/lib/google/oauth";
import { saveOpportunityFromMessage } from "@/lib/intake/saveMessage";
import { getMessageByExternalId } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messageIds } = body as { messageIds?: string[] };

    if (!messageIds?.length) {
      return NextResponse.json(
        { error: "messageIds is required" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    const results: Array<{
      messageId: string;
      status: "imported" | "skipped";
      opportunity_id?: string;
      reason?: string;
    }> = [];

    for (const messageId of messageIds) {
      const existing = await getMessageByExternalId(messageId);
      if (existing) {
        results.push({
          messageId,
          status: "skipped",
          reason: "Already imported",
          opportunity_id: existing.opportunity_id ?? undefined,
        });
        continue;
      }

      const parsed = await fetchGmailMessage(accessToken, messageId);
      const fullText = [
        parsed.subject ? `Subject: ${parsed.subject}` : null,
        parsed.body,
      ]
        .filter(Boolean)
        .join("\n\n");

      const extraction = await extractRecruitingMessage(fullText, "gmail");
      const extracted = {
        ...extraction.data,
        recruiter_name:
          extraction.data.recruiter_name ?? parsed.senderName,
        recruiter_email:
          extraction.data.recruiter_email ?? parsed.senderEmail,
      };
      const saved = await saveOpportunityFromMessage({
        text: fullText,
        source: "gmail",
        extracted,
        subject: parsed.subject,
        snippet: parsed.snippet,
        externalMessageId: parsed.id,
        receivedAt: parsed.receivedAt,
      });

      results.push({
        messageId,
        status: "imported",
        opportunity_id: saved.opportunity_id,
      });
    }

    const imported = results.filter((r) => r.status === "imported").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json({
      imported,
      skipped,
      results,
    });
  } catch (err) {
    return handleApiError(err, "Failed to import Gmail messages");
  }
}
