import {
  createSimplifySource,
  SIMPLIFY_SOURCE_IDS,
} from "./simplify";
import { arbeitnowSource } from "./arbeitnow";
import { greenhouseSource } from "./greenhouse";
import { himalayasSource } from "./himalayas";
import { jobicySource } from "./jobicy";
import { remotiveSource } from "./remotive";
import type { DiscoverSource } from "../types";

const SOURCES: DiscoverSource[] = [
  ...SIMPLIFY_SOURCE_IDS.map((id) => createSimplifySource(id)!),
  greenhouseSource,
  himalayasSource,
  jobicySource,
  remotiveSource,
  arbeitnowSource,
];

const SOURCE_MAP = new Map(SOURCES.map((source) => [source.meta.id, source]));

export function listDiscoverSources() {
  return SOURCES.map((source) => ({
    ...source.meta,
    attribution: source.attribution ?? null,
  }));
}

export function getDiscoverSource(sourceId: string): DiscoverSource | null {
  return SOURCE_MAP.get(sourceId) ?? null;
}

export function parseListingKey(key: string): {
  sourceId: string;
  nativeId: string;
} | null {
  const colon = key.indexOf(":");
  if (colon <= 0) return null;
  return {
    sourceId: key.slice(0, colon),
    nativeId: key.slice(colon + 1),
  };
}
