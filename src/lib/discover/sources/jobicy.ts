import { paginateDiscoverListings } from "../filter";
import type {
  DiscoverListing,
  DiscoverSource,
  FetchDiscoverOptions,
} from "../types";

interface JobicyJob {
  id: number;
  url: string;
  jobSlug: string;
  jobTitle: string;
  companyName: string;
  jobIndustry: string[];
  jobType: string[];
  jobGeo: string;
  jobLevel: string;
  jobExcerpt: string;
  pubDate?: string;
}

interface JobicyResponse {
  jobs: JobicyJob[];
  jobCount?: number;
}

const SOURCE_ID = "jobicy";
const SOURCE_LABEL = "Jobicy · Remote Jobs";
const FETCH_COUNT = 100;

let cache: { fetchedAt: number; listings: DiscoverListing[] } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000;

function mapJobicyJob(job: JobicyJob): DiscoverListing {
  return {
    key: `${SOURCE_ID}:${job.jobSlug}`,
    sourceId: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    nativeId: job.jobSlug,
    company: job.companyName,
    title: job.jobTitle,
    locations: job.jobGeo ? [job.jobGeo] : ["Remote"],
    url: job.url,
    postedAt: job.pubDate ?? null,
    tags: [...job.jobIndustry, ...job.jobType, job.jobLevel].filter(Boolean),
    active: true,
    summary: job.jobExcerpt?.slice(0, 180) ?? null,
  };
}

async function loadJobicyJobs(): Promise<DiscoverListing[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.listings;
  }

  const res = await fetch(
    `https://jobicy.com/api/v2/remote-jobs?count=${FETCH_COUNT}`,
    { next: { revalidate: 1800 }, headers: { Accept: "application/json" } }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Jobicy jobs (${res.status})`);
  }

  const data = (await res.json()) as JobicyResponse;
  const listings = (data.jobs ?? []).map(mapJobicyJob);
  cache = { fetchedAt: Date.now(), listings };
  return listings;
}

export const jobicySource: DiscoverSource = {
  meta: {
    id: SOURCE_ID,
    label: SOURCE_LABEL,
    description:
      "Remote job feed from Jobicy. Apply via Jobicy; listings refresh a few times per day.",
    category: "remote",
  },
  attribution: {
    label: "Jobicy",
    href: "https://jobicy.com/",
  },
  async fetchListings(options) {
    const all = await loadJobicyJobs();
    return paginateDiscoverListings(all, options);
  },
  async getListing(nativeId) {
    const all = await loadJobicyJobs();
    return all.find((listing) => listing.nativeId === nativeId) ?? null;
  },
};
