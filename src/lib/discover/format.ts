import type { DiscoverListing } from "./types";

export function buildDiscoverExternalId(
  listingOrSourceId: DiscoverListing | string,
  nativeId?: string
): string {
  if (typeof listingOrSourceId === "string") {
    return `discover:${listingOrSourceId}:${nativeId}`;
  }
  return `discover:${listingOrSourceId.sourceId}:${listingOrSourceId.nativeId}`;
}

export function formatListingAsMessage(listing: DiscoverListing): string {
  const lines = [
    `Company: ${listing.company}`,
    `Role: ${listing.title}`,
    listing.locations.length > 0
      ? `Locations: ${listing.locations.join("; ")}`
      : null,
    listing.tags.length > 0 ? `Tags: ${listing.tags.join(", ")}` : null,
    listing.postedAt ? `Posted: ${listing.postedAt}` : null,
    listing.summary ? `Summary: ${listing.summary}` : null,
    `Apply: ${listing.url}`,
    `Source: ${listing.sourceLabel}`,
    `Listing ID: ${listing.nativeId}`,
  ];

  return lines.filter(Boolean).join("\n");
}

export function listingToExtracted(listing: DiscoverListing) {
  const locationText =
    listing.locations.length > 0 ? listing.locations.join(", ") : null;

  return {
    company: listing.company,
    role_title: listing.title,
    recruiter_name: null,
    recruiter_email: null,
    deadline: null,
    stage: "New" as const,
    next_action: "Review job posting and apply",
    action_type: "none" as const,
    is_time_sensitive: false,
    confidence: 1,
    short_summary: `${listing.company} · ${listing.title}`,
    provider: "heuristic" as const,
    extraction_status: "success" as const,
    needs_review: false,
    explanation: `Imported from ${listing.sourceLabel}`,
    location: locationText,
  };
}
