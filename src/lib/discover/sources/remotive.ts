import { paginateDiscoverListings } from "../filter";
import type {
  DiscoverListing,
  DiscoverSource,
  FetchDiscoverOptions,
} from "../types";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

const SOURCE_ID = "remotive";
const SOURCE_LABEL = "Remotive · Remote Jobs";
const DEFAULT_CATEGORY = "software-dev";

let cache: { fetchedAt: number; listings: DiscoverListing[] } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

function mapRemotiveJob(job: RemotiveJob): DiscoverListing {
  const locations = job.candidate_required_location
    ? [job.candidate_required_location]
    : ["Remote"];

  return {
    key: `${SOURCE_ID}:${job.id}`,
    sourceId: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    nativeId: String(job.id),
    company: job.company_name,
    title: job.title,
    locations,
    url: job.url,
    postedAt: job.publication_date ?? null,
    tags: [job.category, job.job_type, ...job.tags].filter(Boolean),
    active: true,
    summary: job.salary || job.category,
  };
}

async function loadRemotiveJobs(): Promise<DiscoverListing[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.listings;
  }

  const url = new URL("https://remotive.com/api/remote-jobs");
  url.searchParams.set("category", DEFAULT_CATEGORY);

  const res = await fetch(url.toString(), {
    next: { revalidate: 900 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Remotive jobs (${res.status})`);
  }

  const data = (await res.json()) as RemotiveResponse;
  const listings = (data.jobs ?? []).map(mapRemotiveJob);
  cache = { fetchedAt: Date.now(), listings };
  return listings;
}

export const remotiveSource: DiscoverSource = {
  meta: {
    id: SOURCE_ID,
    label: SOURCE_LABEL,
    description:
      "Remote tech jobs from the Remotive public API. Best for software, data, and product roles.",
    category: "remote",
  },
  async fetchListings(options: FetchDiscoverOptions) {
    const all = await loadRemotiveJobs();
    return paginateDiscoverListings(all, options);
  },
  async getListing(nativeId: string) {
    const all = await loadRemotiveJobs();
    return all.find((listing) => listing.nativeId === nativeId) ?? null;
  },
};
