import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { getImportedExternalIdsWithPrefix } from "@/lib/db";
import { buildDiscoverExternalId } from "@/lib/discover/format";
import { getDiscoverSource } from "@/lib/discover/sources";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("source");
    const query = searchParams.get("q") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    if (!sourceId) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }

    const source = getDiscoverSource(sourceId);
    if (!source) {
      return NextResponse.json({ error: "Unknown source" }, { status: 404 });
    }

    const result = await source.fetchListings({
      query,
      limit,
      offset,
      activeOnly,
    });
    const importedIds = await getImportedExternalIdsWithPrefix("discover:");

    const enriched = result.listings.map((listing) => {
      const externalId = buildDiscoverExternalId(listing);
      return {
        ...listing,
        alreadyImported: importedIds.has(externalId),
      };
    });

    return NextResponse.json({
      source: {
        ...source.meta,
        attribution: source.attribution ?? null,
      },
      count: enriched.length,
      total: result.total,
      hasMore: result.hasMore,
      offset,
      listings: enriched,
    });
  } catch (err) {
    return handleApiError(err, "Failed to load job listings");
  }
}
