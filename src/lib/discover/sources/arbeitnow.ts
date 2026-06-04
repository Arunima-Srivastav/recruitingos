import { paginateDiscoverListings } from "../filter";
import type {
  DiscoverListing,
  DiscoverSource,
  FetchDiscoverOptions,
} from "../types";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
}

const SOURCE_ID = "arbeitnow";
const SOURCE_LABEL = "Arbeitnow · Job Board";

const TECH_KEYWORDS =
  /software|engineer|developer|data|machine learning|ml|ai|frontend|backend|full.?stack|devops|intern|graduate|new grad|product manager|quant/i;

let cache: { fetchedAt: number; listings: DiscoverListing[] } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mapArbeitnowJob(job: ArbeitnowJob): DiscoverListing {
  const summary = stripHtml(job.description).slice(0, 180);

  return {
    key: `${SOURCE_ID}:${job.slug}`,
    sourceId: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    nativeId: job.slug,
    company: job.company_name,
    title: job.title,
    locations: [job.remote ? "Remote" : job.location].filter(Boolean),
    url: job.url,
    postedAt: job.created_at
      ? new Date(job.created_at * 1000).toISOString()
      : null,
    tags: [...job.tags, ...job.job_types],
    active: true,
    summary: summary || null,
  };
}

function isTechRelevant(job: ArbeitnowJob): boolean {
  const blob = `${job.title} ${job.tags.join(" ")} ${job.job_types.join(" ")}`;
  return TECH_KEYWORDS.test(blob);
}

async function loadArbeitnowJobs(): Promise<DiscoverListing[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.listings;
  }

  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    next: { revalidate: 900 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Arbeitnow jobs (${res.status})`);
  }

  const data = (await res.json()) as ArbeitnowResponse;
  const listings = (data.data ?? [])
    .filter(isTechRelevant)
    .map(mapArbeitnowJob);

  cache = { fetchedAt: Date.now(), listings };
  return listings;
}

export const arbeitnowSource: DiscoverSource = {
  meta: {
    id: SOURCE_ID,
    label: SOURCE_LABEL,
    description:
      "Free public job board API filtered to tech-relevant roles (software, data, intern, new grad).",
    category: "general",
  },
  async fetchListings(options: FetchDiscoverOptions) {
    const all = await loadArbeitnowJobs();
    return paginateDiscoverListings(all, options);
  },
  async getListing(nativeId: string) {
    const all = await loadArbeitnowJobs();
    return all.find((listing) => listing.nativeId === nativeId) ?? null;
  },
};
