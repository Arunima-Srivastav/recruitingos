import { paginateDiscoverListings } from "../filter";
import type {
  DiscoverListing,
  DiscoverSource,
  FetchDiscoverOptions,
} from "../types";

interface SimplifyRawListing {
  id: string;
  company_name: string;
  title: string;
  url: string;
  locations?: string[];
  terms?: string[];
  active?: boolean;
  is_visible?: boolean;
  date_posted?: number;
  date_updated?: number;
}

const FEEDS: Record<
  string,
  { label: string; url: string; category: DiscoverSource["meta"]["category"] }
> = {
  "simplify-internships": {
    label: "Simplify · Summer 2026 Internships",
    url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json",
    category: "internship",
  },
  "simplify-newgrad": {
    label: "Simplify · New Grad Positions",
    url: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json",
    category: "new_grad",
  },
};

const cache = new Map<string, { fetchedAt: number; listings: DiscoverListing[] }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function mapSimplifyListing(
  sourceId: string,
  sourceLabel: string,
  raw: SimplifyRawListing
): DiscoverListing {
  const terms = raw.terms ?? [];
  return {
    key: `${sourceId}:${raw.id}`,
    sourceId,
    sourceLabel,
    nativeId: raw.id,
    company: raw.company_name,
    title: raw.title,
    locations: raw.locations ?? [],
    url: raw.url,
    postedAt: raw.date_posted
      ? new Date(raw.date_posted * 1000).toISOString()
      : null,
    tags: terms,
    active: raw.active !== false && raw.is_visible !== false,
    summary: terms.length > 0 ? terms.join(", ") : null,
  };
}

async function loadSimplifyFeed(sourceId: string): Promise<DiscoverListing[]> {
  const feed = FEEDS[sourceId];
  if (!feed) return [];

  const cached = cache.get(sourceId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.listings;
  }

  const res = await fetch(feed.url, {
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${feed.label} (${res.status})`);
  }

  const raw = (await res.json()) as SimplifyRawListing[];
  const listings = raw.map((item) =>
    mapSimplifyListing(sourceId, feed.label, item)
  );

  cache.set(sourceId, { fetchedAt: Date.now(), listings });
  return listings;
}

export function createSimplifySource(sourceId: string): DiscoverSource | null {
  const feed = FEEDS[sourceId];
  if (!feed) return null;

  return {
    meta: {
      id: sourceId,
      label: feed.label,
      description: "Public listings from SimplifyJobs on GitHub (updated daily).",
      category: feed.category,
    },
    async fetchListings(options: FetchDiscoverOptions) {
      const all = await loadSimplifyFeed(sourceId);
      return paginateDiscoverListings(all, options);
    },
    async getListing(nativeId: string) {
      const all = await loadSimplifyFeed(sourceId);
      return all.find((listing) => listing.nativeId === nativeId) ?? null;
    },
  };
}

export const SIMPLIFY_SOURCE_IDS = Object.keys(FEEDS);
