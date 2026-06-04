"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfigErrorBanner from "@/components/ConfigErrorBanner";
import type { DiscoverSourceCategory } from "@/lib/discover/types";

interface DiscoverSourceMeta {
  id: string;
  label: string;
  description: string;
  category: DiscoverSourceCategory;
  attribution?: { label: string; href: string } | null;
}

interface DiscoverListingRow {
  key: string;
  sourceId: string;
  sourceLabel: string;
  company: string;
  title: string;
  locations: string[];
  url: string;
  postedAt: string | null;
  tags: string[];
  active: boolean;
  summary: string | null;
  alreadyImported: boolean;
}

const CATEGORY_LABELS: Record<DiscoverSourceCategory, string> = {
  internship: "Internships",
  new_grad: "New grad",
  remote: "Remote",
  general: "General",
};

const PAGE_SIZE = 50;

export default function DiscoverPage() {
  const [sources, setSources] = useState<DiscoverSourceMeta[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<DiscoverListingRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const res = await fetch("/api/discover/sources");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load sources");
      const nextSources = (data.sources ?? []) as DiscoverSourceMeta[];
      setSources(nextSources);
      if (nextSources.length > 0) {
        setSourceId((current) => current || nextSources[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
    } finally {
      setLoadingSources(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const activeSource = useMemo(
    () => sources.find((source) => source.id === sourceId) ?? null,
    [sources, sourceId]
  );

  const importableKeys = useMemo(
    () => listings.filter((row) => !row.alreadyImported).map((row) => row.key),
    [listings]
  );

  async function fetchListingsPage(offset: number, append: boolean) {
    if (!sourceId) return;

    const params = new URLSearchParams({
      source: sourceId,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (query.trim()) params.set("q", query.trim());

    const res = await fetch(`/api/discover/listings?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Search failed");

    const rows = (data.listings ?? []) as DiscoverListingRow[];
    setTotal(data.total ?? rows.length);
    setHasMore(Boolean(data.hasMore));
    setListings((prev) => (append ? [...prev, ...rows] : rows));

    if (!append) {
      setSelected(new Set(rows.filter((row) => !row.alreadyImported).map((row) => row.key)));
    }
  }

  async function handleSearch(event?: React.FormEvent) {
    event?.preventDefault();
    if (!sourceId) return;

    setLoadingListings(true);
    setError(null);
    setNotice(null);
    setListings([]);
    setSelected(new Set());

    try {
      await fetchListingsPage(0, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoadingListings(false);
    }
  }

  async function handleFetchMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setError(null);

    try {
      await fetchListingsPage(listings.length, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/discover/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");

      setNotice(
        `Imported ${data.imported} role${data.imported === 1 ? "" : "s"}` +
          (data.skipped ? ` (${data.skipped} skipped)` : "")
      );

      await handleSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function toggleSelected(key: string, disabled: boolean) {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllImportable() {
    setSelected(new Set(importableKeys));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Discover</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Browse public job boards and add roles to your pipeline. Sources include
        SimplifyJobs, Greenhouse (curated companies), Himalayas, Jobicy, Remotive,
        and Arbeitnow. Imports use structured fields directly (no AI parsing).
      </p>

      {error && (
        <div className="mt-4">
          <ConfigErrorBanner message={error} />
        </div>
      )}

      {notice && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}{" "}
          <Link href="/pipeline" className="font-medium underline">
            View pipeline
          </Link>
        </div>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Job source</h2>
        {loadingSources ? (
          <p className="mt-2 text-sm text-slate-500">Loading sources...</p>
        ) : (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sources.map((source) => (
                <label
                  key={source.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-3 ${
                    sourceId === source.id
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="source"
                    value={source.id}
                    checked={sourceId === source.id}
                    onChange={() => setSourceId(source.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      {source.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {CATEGORY_LABELS[source.category]} · {source.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company, role, location..."
                className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={loadingListings || !sourceId}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loadingListings ? "Searching..." : "Search listings"}
              </button>
            </form>

            {activeSource && (
              <p className="mt-3 text-xs text-slate-500">
                {PAGE_SIZE} listings per page from {activeSource.label}.
                Already-imported roles are marked and skipped on re-import.
              </p>
            )}
          </>
        )}
      </section>

      {listings.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Showing {listings.length} of {total} · {selected.size} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllImportable}
                disabled={importableKeys.length === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={deselectAll}
                disabled={selected.size === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Deselect all
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? "Importing..." : "Add selected to pipeline"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {listings.map((listing) => {
              const disabled = listing.alreadyImported;
              return (
                <div
                  key={listing.key}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    disabled ? "border-slate-100 opacity-70" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(listing.key)}
                      disabled={disabled}
                      onChange={() => toggleSelected(listing.key, disabled)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {listing.company} · {listing.title}
                        </h3>
                        {disabled && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            In pipeline
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {listing.locations.length > 0
                          ? listing.locations.join(" · ")
                          : "Location not listed"}
                        {listing.tags.length > 0
                          ? ` · ${listing.tags.slice(0, 4).join(", ")}`
                          : ""}
                      </p>
                      {listing.summary && (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                          {listing.summary}
                        </p>
                      )}
                    </div>
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View posting
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleFetchMore}
                disabled={loadingMore}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more listings"}
              </button>
            </div>
          )}
        </section>
      )}

      {activeSource?.attribution && (
        <p className="mt-8 text-center text-xs text-slate-500">
          Job listings courtesy of{" "}
          <a
            href={activeSource.attribution.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:underline"
          >
            {activeSource.attribution.label}
          </a>
          . Apply on their site.
        </p>
      )}

      {!loadingListings && listings.length === 0 && sourceId && !loadingSources && (
        <p className="mt-8 text-center text-sm text-slate-500">
          Pick a source and search to browse open roles.
        </p>
      )}
    </div>
  );
}
