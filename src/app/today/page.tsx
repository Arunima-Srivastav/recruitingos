"use client";

import { useCallback, useEffect, useState } from "react";
import ConfigErrorBanner from "@/components/ConfigErrorBanner";
import ActionCard from "@/components/ActionCard";
import EmptyState from "@/components/EmptyState";
import { getSupabaseConfigError } from "@/lib/config";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { ActionWithOpportunity, Opportunity } from "@/lib/types";

export default function TodayPage() {
  const [actions, setActions] = useState<ActionWithOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from("actions")
        .select("*, opportunity:opportunities(*)")
        .eq("status", "pending")
        .order("priority_score", { ascending: false });
      if (fetchError) throw fetchError;
      setActions(
        (data ?? []).map((row) => {
          const { opportunity, ...action } = row as typeof row & {
            opportunity: Opportunity | null;
          };
          return { ...action, opportunity } as ActionWithOpportunity;
        })
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load today's actions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  async function handleComplete(actionId: string) {
    setCompletingId(actionId);
    try {
      const res = await fetch("/api/actions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: actionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to complete");
      }
      setActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete action");
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Today</h1>
      <p className="mt-2 text-slate-600">
        Prioritized actions based on urgency, stage, and deadlines.
      </p>

      {loading && (
        <p className="mt-6 text-sm text-slate-500">Loading actions...</p>
      )}

      {error && (
        <div className="mt-4">
          {getSupabaseConfigError() ? (
            <ConfigErrorBanner message={error} />
          ) : (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}

      {!loading && !error && actions.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="You're all caught up"
            description="No pending actions. Add a new message or check the pipeline."
            action={
              <Link
                href="/intake"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
              >
                Add Message
              </Link>
            }
          />
        </div>
      )}

      <div className="mt-6 space-y-4">
        {actions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            onComplete={handleComplete}
            completing={completingId === action.id}
          />
        ))}
      </div>
    </div>
  );
}
