import type {
  DiscoverListing,
  DiscoverSource,
  FetchDiscoverOptions,
} from "../types";

interface HimalayasJob {
  title: string;
  excerpt: string;
  companyName: string;
  employmentType: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  locationRestrictions?: string[];
  categories?: string[];
  parentCategories?: string[];
  applicationLink?: string;
  guid: string;
  pubDate?: string;
}

interface HimalayasResponse {
  jobs: HimalayasJob[];
  totalCount: number;
  offset: number;
  limit: number;
}

const SOURCE_ID = "himalayas";
const SOURCE_LABEL = "Himalayas · Remote Jobs";

function formatSalary(job: HimalayasJob): string | null {
  if (!job.minSalary && !job.maxSalary) return null;
  const currency = job.currency ?? "USD";
  if (job.minSalary && job.maxSalary && job.minSalary !== job.maxSalary) {
    return `${currency} ${job.minSalary.toLocaleString()}–${job.maxSalary.toLocaleString()}`;
  }
  const value = job.minSalary ?? job.maxSalary;
  return value ? `${currency} ${value.toLocaleString()}` : null;
}

function mapHimalayasJob(job: HimalayasJob): DiscoverListing {
  const nativeId = job.guid;

  return {
    key: `${SOURCE_ID}:${nativeId}`,
    sourceId: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    nativeId,
    company: job.companyName,
    title: job.title,
    locations: job.locationRestrictions?.length
      ? job.locationRestrictions
      : ["Remote"],
    url: job.applicationLink ?? "https://himalayas.app/jobs",
    postedAt: job.pubDate ?? null,
    tags: [
      job.employmentType,
      ...(job.parentCategories ?? []),
      ...(job.categories ?? []).slice(0, 3),
    ].filter(Boolean),
    active: true,
    summary: formatSalary(job) ?? job.excerpt?.slice(0, 180) ?? null,
  };
}

async function fetchHimalayasPage(
  options: FetchDiscoverOptions
): Promise<{ listings: DiscoverListing[]; total: number; hasMore: boolean }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);

  const url = new URL("https://himalayas.app/jobs/api");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (options.query?.trim()) {
    url.searchParams.set("search", options.query.trim());
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 900 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Himalayas jobs (${res.status})`);
  }

  const data = (await res.json()) as HimalayasResponse;
  const listings = (data.jobs ?? []).map((job) => mapHimalayasJob(job));
  const total = data.totalCount ?? listings.length;

  return {
    listings,
    total,
    hasMore: offset + listings.length < total,
  };
}

export const himalayasSource: DiscoverSource = {
  meta: {
    id: SOURCE_ID,
    label: SOURCE_LABEL,
    description:
      "Remote roles with salary and timezone data from the Himalayas public API.",
    category: "remote",
  },
  attribution: {
    label: "Himalayas",
    href: "https://himalayas.app/",
  },
  async fetchListings(options) {
    return fetchHimalayasPage(options);
  },
  async getListing(nativeId) {
    for (let offset = 0; offset < 500; offset += 50) {
      const page = await fetchHimalayasPage({ limit: 50, offset });
      const match = page.listings.find((listing) => listing.nativeId === nativeId);
      if (match) return match;
      if (!page.hasMore) break;
    }
    return null;
  },
};
