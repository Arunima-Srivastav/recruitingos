import { paginateDiscoverListings } from "../filter";
import type {
  DiscoverListing,
  DiscoverSource,
  FetchDiscoverOptions,
} from "../types";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  first_published?: string;
  company_name?: string;
  location?: { name?: string };
  departments?: Array<{ name: string }>;
  metadata?: Array<{ name: string; value: string | null }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

const SOURCE_ID = "greenhouse";
const SOURCE_LABEL = "Greenhouse · Target Companies";

/** Curated public Greenhouse board tokens (boards-api.greenhouse.io). */
const BOARDS = [
  { token: "stripe", company: "Stripe" },
  { token: "figma", company: "Figma" },
  { token: "databricks", company: "Databricks" },
  { token: "discord", company: "Discord" },
  { token: "notion", company: "Notion" },
  { token: "coinbase", company: "Coinbase" },
  { token: "ramp", company: "Ramp" },
  { token: "brex", company: "Brex" },
];

const cache = new Map<string, { fetchedAt: number; listings: DiscoverListing[] }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function nativeId(boardToken: string, jobId: number): string {
  return `${boardToken}-${jobId}`;
}

function mapGreenhouseJob(
  boardToken: string,
  fallbackCompany: string,
  job: GreenhouseJob
): DiscoverListing {
  const departments = (job.departments ?? []).map((d) => d.name);
  const location = job.location?.name;

  return {
    key: `${SOURCE_ID}:${nativeId(boardToken, job.id)}`,
    sourceId: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    nativeId: nativeId(boardToken, job.id),
    company: job.company_name || fallbackCompany,
    title: job.title,
    locations: location ? [location] : [],
    url: job.absolute_url,
    postedAt: job.first_published ?? job.updated_at ?? null,
    tags: departments,
    active: true,
    summary: departments.length > 0 ? departments.join(", ") : null,
  };
}

async function loadBoard(boardToken: string, company: string): Promise<DiscoverListing[]> {
  const cached = cache.get(boardToken);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.listings;
  }

  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs`,
    { next: { revalidate: 900 } }
  );

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as GreenhouseResponse;
  const listings = (data.jobs ?? []).map((job) =>
    mapGreenhouseJob(boardToken, company, job)
  );

  cache.set(boardToken, { fetchedAt: Date.now(), listings });
  return listings;
}

async function loadAllGreenhouseJobs(): Promise<DiscoverListing[]> {
  const batches = await Promise.all(
    BOARDS.map((board) => loadBoard(board.token, board.company))
  );
  return batches
    .flat()
    .sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
}

export const greenhouseSource: DiscoverSource = {
  meta: {
    id: SOURCE_ID,
    label: SOURCE_LABEL,
    description: `Open roles from ${BOARDS.length} curated companies via the Greenhouse public boards API.`,
    category: "general",
  },
  async fetchListings(options: FetchDiscoverOptions) {
    const all = await loadAllGreenhouseJobs();
    return paginateDiscoverListings(all, options);
  },
  async getListing(id: string) {
    const dash = id.lastIndexOf("-");
    if (dash <= 0) return null;
    const boardToken = id.slice(0, dash);
    const board = BOARDS.find((b) => b.token === boardToken);
    if (!board) return null;
    const all = await loadBoard(board.token, board.company);
    return all.find((listing) => listing.nativeId === id) ?? null;
  },
};
