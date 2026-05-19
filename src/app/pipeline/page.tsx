"use client";

import { useCallback, useEffect, useState } from "react";
import StageColumn from "@/components/StageColumn";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { STAGES } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import type { Opportunity } from "@/lib/types";
import { DEMO_USER_ID } from "@/lib/constants";

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from("opportunities")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .order("priority_score", { ascending: false });
      if (fetchError) throw fetchError;
      setOpportunities((data ?? []) as Opportunity[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load pipeline. Check Supabase env vars."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  async function handleStageChange(id: string, stage: string) {
    const res = await fetch("/api/opportunities/update-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunity_id: id, stage }),
    });
    if (res.ok) {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, stage } : o))
      );
    }
  }

  const grouped = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = opportunities.filter((o) => o.stage === stage);
      return acc;
    },
    {} as Record<string, Opportunity[]>
  );

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-slate-600">
            All recruiting opportunities grouped by stage.
          </p>
        </div>
        <Link
          href="/intake"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add Message
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-slate-500">Loading pipeline...</p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && opportunities.length === 0 && (
        <EmptyState
          title="No opportunities yet"
          description="Add a message or load demo data to populate your pipeline."
          action={
            <Link
              href="/intake"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Add Message
            </Link>
          }
        />
      )}

      {opportunities.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              opportunities={grouped[stage] ?? []}
              onStageChange={handleStageChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
