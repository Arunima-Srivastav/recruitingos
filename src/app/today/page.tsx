"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfigErrorBanner from "@/components/ConfigErrorBanner";
import ActionCard from "@/components/ActionCard";
import EmptyState from "@/components/EmptyState";
import NeedsReplyPanel from "@/components/NeedsReplyPanel";
import { getSupabaseConfigError } from "@/lib/config";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { NeedsReplyItem } from "@/lib/replies/detect";
import type { ActionWithOpportunity, Opportunity } from "@/lib/types";

export default function TodayPage() {
  const [actions, setActions] = useState<ActionWithOpportunity[]>([]);
  const [replyItems, setReplyItems] = useState<NeedsReplyItem[]>([]);
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
      const [actionsRes, repliesRes] = await Promise.all([
        supabase
          .from("actions")
          .select("*, opportunity:opportunities(*)")
          .eq("status", "pending")
          .order("priority_score", { ascending: false }),
        fetch("/api/replies"),
      ]);

      if (actionsRes.error) throw actionsRes.error;

      setActions(
        (actionsRes.data ?? []).map((row) => {
          const { opportunity, ...action } = row as typeof row & {
            opportunity: Opportunity | null;
          };
          return { ...action, opportunity } as ActionWithOpportunity;
        })
      );

      if (repliesRes.ok) {
        const data = (await repliesRes.json()) as { items: NeedsReplyItem[] };
        setReplyItems(data.items ?? []);
      } else {
        setReplyItems([]);
      }
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

  const replyActionIds = useMemo(
    () => new Set(replyItems.map((item) => item.actionId).filter(Boolean)),
    [replyItems]
  );

  const otherActions = useMemo(
    () => actions.filter((action) => !replyActionIds.has(action.id)),
    [actions, replyActionIds]
  );

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
      setReplyItems((prev) => prev.filter((item) => item.actionId !== actionId));
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
        Prioritized actions based on urgency, stage, and deadlines. Reply items
        are detected automatically from your pipeline.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/calendar" className="text-indigo-600 hover:underline">
          View calendar & export deadlines
        </Link>
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

      {!loading && !error && replyItems.length === 0 && otherActions.length === 0 && (
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

      {!loading && !error && replyItems.length > 0 && (
        <div className="mt-6">
          <NeedsReplyPanel items={replyItems} compact />
        </div>
      )}

      {otherActions.length > 0 && (
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Other actions
        </h2>
      )}

      <div className="mt-6 space-y-4">
        {otherActions.map((action) => (
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
