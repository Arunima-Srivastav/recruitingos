"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface DuplicateEntry {
  opportunityId: string;
  reason: string;
  detail: string;
  company: string | null;
  role_title: string | null;
  source: string | null;
  stage: string | null;
}

interface Props {
  opportunityId: string;
  onMerged?: (primaryId: string) => void;
}

function reasonLabel(reason: string): string {
  if (reason === "company_role") return "Same company and role";
  if (reason === "apply_url") return "Same job URL";
  return "Possible duplicate";
}

export default function DuplicateOpportunityBanner({
  opportunityId,
  onMerged,
}: Props) {
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/opportunities/duplicates?opportunity_id=${encodeURIComponent(opportunityId)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load duplicates");
      setDuplicates(data.duplicates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load duplicates");
      setDuplicates([]);
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  async function handleMerge(otherId: string) {
    if (
      !window.confirm(
        "Merge the other opportunity into this one? Messages and actions will be combined here."
      )
    ) {
      return;
    }

    setMergingId(otherId);
    setError(null);
    try {
      const res = await fetch("/api/opportunities/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_id: opportunityId,
          secondary_id: otherId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Merge failed");
      setDuplicates([]);
      onMerged?.(data.opportunity?.id ?? opportunityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setMergingId(null);
    }
  }

  if (loading || duplicates.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">Possible duplicate</h2>
      <p className="mt-1 text-sm text-amber-800">
        These pipeline entries look like the same role. Merge to keep one card with
        all messages.
      </p>
      {error && (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      )}
      <ul className="mt-3 space-y-2">
        {duplicates.map((dup) => (
          <li
            key={dup.opportunityId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2"
          >
            <div className="text-sm">
              <p className="font-medium text-slate-900">
                {dup.company ?? "Unknown"} · {dup.role_title ?? "Role"}
              </p>
              <p className="text-xs text-slate-600">
                {reasonLabel(dup.reason)}
                {dup.source ? ` · ${dup.source}` : ""}
                {dup.stage ? ` · ${dup.stage}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/opportunities/${dup.opportunityId}`}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                View
              </Link>
              <button
                type="button"
                onClick={() => handleMerge(dup.opportunityId)}
                disabled={mergingId === dup.opportunityId}
                className="rounded-md bg-amber-700 px-2 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {mergingId === dup.opportunityId ? "Merging..." : "Merge here"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
