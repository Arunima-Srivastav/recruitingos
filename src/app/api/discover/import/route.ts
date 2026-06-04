import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { getMessageByExternalId } from "@/lib/db";
import {
  buildDiscoverExternalId,
  formatListingAsMessage,
  listingToExtracted,
} from "@/lib/discover/format";
import { getDiscoverSource, parseListingKey } from "@/lib/discover/sources";
import { saveOpportunityFromMessage } from "@/lib/intake/saveMessage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keys } = body as { keys?: string[] };

    if (!keys?.length) {
      return NextResponse.json({ error: "keys is required" }, { status: 400 });
    }

    const results: Array<{
      key: string;
      status: "imported" | "skipped";
      opportunity_id?: string;
      reason?: string;
    }> = [];

    for (const key of keys) {
      const parsed = parseListingKey(key);
      if (!parsed) {
        results.push({ key, status: "skipped", reason: "Invalid listing key" });
        continue;
      }

      const source = getDiscoverSource(parsed.sourceId);
      if (!source) {
        results.push({ key, status: "skipped", reason: "Unknown source" });
        continue;
      }

      const listing = await source.getListing(parsed.nativeId);
      if (!listing) {
        results.push({ key, status: "skipped", reason: "Listing not found" });
        continue;
      }

      const externalId = buildDiscoverExternalId(listing);
      const existing = await getMessageByExternalId(externalId);
      if (existing) {
        results.push({
          key,
          status: "skipped",
          reason: "Already in pipeline",
          opportunity_id: existing.opportunity_id ?? undefined,
        });
        continue;
      }

      const extracted = listingToExtracted(listing);
      const saved = await saveOpportunityFromMessage({
        text: formatListingAsMessage(listing),
        source: "discover",
        extracted,
        subject: `${listing.company} · ${listing.title}`,
        snippet: listing.summary,
        externalMessageId: externalId,
        receivedAt: listing.postedAt,
      });

      results.push({
        key,
        status: "imported",
        opportunity_id: saved.opportunity_id,
      });
    }

    const imported = results.filter((r) => r.status === "imported").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json({ imported, skipped, results });
  } catch (err) {
    return handleApiError(err, "Failed to import listings");
  }
}
