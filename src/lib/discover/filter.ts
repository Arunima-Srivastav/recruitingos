import type { DiscoverListing } from "./types";

export function paginateDiscoverListings(
  listings: DiscoverListing[],
  options: {
    query?: string;
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  }
): { listings: DiscoverListing[]; total: number; hasMore: boolean } {
  const query = options.query?.trim().toLowerCase();
  const offset = Math.max(options.offset ?? 0, 0);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const activeOnly = options.activeOnly !== false;

  let filtered = listings;

  if (activeOnly) {
    filtered = filtered.filter((listing) => listing.active);
  }

  if (query) {
    filtered = filtered.filter((listing) => {
      const haystack = [
        listing.company,
        listing.title,
        listing.locations.join(" "),
        listing.tags.join(" "),
        listing.summary ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);

  return {
    listings: page,
    total,
    hasMore: offset + page.length < total,
  };
}

/** @deprecated use paginateDiscoverListings */
export function filterDiscoverListings(
  listings: DiscoverListing[],
  options: { query?: string; limit?: number; activeOnly?: boolean }
): DiscoverListing[] {
  return paginateDiscoverListings(listings, options).listings;
}
