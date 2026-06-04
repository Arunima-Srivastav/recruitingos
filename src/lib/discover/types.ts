export type DiscoverSourceCategory =
  | "internship"
  | "new_grad"
  | "remote"
  | "general";

export interface DiscoverListing {
  /** Unique key for UI selection: `{sourceId}:{nativeId}` */
  key: string;
  sourceId: string;
  sourceLabel: string;
  nativeId: string;
  company: string;
  title: string;
  locations: string[];
  url: string;
  postedAt: string | null;
  tags: string[];
  active: boolean;
  summary: string | null;
}

export interface DiscoverSourceMeta {
  id: string;
  label: string;
  description: string;
  category: DiscoverSourceCategory;
}

export interface FetchDiscoverOptions {
  query?: string;
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}

export interface DiscoverFetchResult {
  listings: DiscoverListing[];
  hasMore: boolean;
  total: number;
}

export interface DiscoverSource {
  meta: DiscoverSourceMeta;
  /** Optional attribution shown in the UI (e.g. Jobicy). */
  attribution?: { label: string; href: string };
  fetchListings(options: FetchDiscoverOptions): Promise<DiscoverFetchResult>;
  getListing(nativeId: string): Promise<DiscoverListing | null>;
}
