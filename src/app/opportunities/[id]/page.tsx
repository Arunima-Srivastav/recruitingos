"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DraftCard from "@/components/DraftCard";
import { STAGES, TONES } from "@/lib/constants";
import type { Tone } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { DEMO_USER_ID } from "@/lib/constants";
import type { Action, Draft, Message, Opportunity } from "@/lib/types";
import { STAGE_COLORS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("professional");
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const [oppRes, msgRes, actRes, draftRes] = await Promise.all([
        supabase
          .from("opportunities")
          .select("*")
          .eq("id", id)
          .eq("user_id", DEMO_USER_ID)
          .single(),
        supabase
          .from("messages")
          .select("*")
          .eq("opportunity_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("actions")
          .select("*")
          .eq("opportunity_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("drafts")
          .select("*")
          .eq("opportunity_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (oppRes.error) throw oppRes.error;
      setOpportunity(oppRes.data as Opportunity);
      setMessages((msgRes.data ?? []) as Message[]);
      setActions((actRes.data ?? []) as Action[]);
      setDrafts((draftRes.data ?? []) as Draft[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opportunity");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchAll();
  }, [id, fetchAll]);

  async function updateStage(stage: string) {
    const res = await fetch("/api/opportunities/update-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunity_id: id, stage }),
    });
    const data = await res.json();
    if (res.ok) setOpportunity(data.opportunity);
  }

  async function generateDraft(draftType: string) {
    setGenerating(draftType);
    try {
      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: id,
          draft_type: draftType,
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate draft");
      setDrafts((prev) => [data.draft, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft generation failed");
    } finally {
      setGenerating(null);
    }
  }

  async function completeAction(actionId: string) {
    const res = await fetch("/api/actions/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_id: actionId }),
    });
    if (res.ok) {
      setActions((prev) =>
        prev.map((a) =>
          a.id === actionId ? { ...a, status: "completed" } : a
        )
      );
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8 text-slate-500 sm:px-6">
        Loading opportunity...
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <p className="text-red-600">{error ?? "Opportunity not found"}</p>
        <Link href="/pipeline" className="mt-4 inline-block text-indigo-600">
          ← Back to pipeline
        </Link>
      </div>
    );
  }

  const stageColor =
    STAGE_COLORS[opportunity.stage] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/pipeline"
        className="text-sm text-indigo-600 hover:text-indigo-800"
      >
        ← Pipeline
      </Link>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {opportunity.company ?? "Unknown Company"}
            </h1>
            <p className="text-lg text-slate-600">
              {opportunity.role_title ?? "Unknown Role"}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              stageColor
            )}
          >
            {opportunity.stage}
          </span>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium text-slate-500">Source:</span>{" "}
            {opportunity.source}
          </p>
          <p>
            <span className="font-medium text-slate-500">Priority:</span>{" "}
            {opportunity.priority_score}
          </p>
          <p>
            <span className="font-medium text-slate-500">Deadline:</span>{" "}
            {formatDate(opportunity.deadline)}
          </p>
          <p>
            <span className="font-medium text-slate-500">Next action:</span>{" "}
            {opportunity.next_action ?? "—"}
          </p>
        </div>

        {opportunity.notes && (
          <p className="mt-3 text-sm text-slate-600">{opportunity.notes}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Stage:</label>
          <select
            value={opportunity.stage}
            onChange={(e) => updateStage(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Generate draft
        </h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600">Tone:</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "reply", label: "Generate Reply" },
            { type: "follow_up", label: "Generate Follow-Up" },
            { type: "scheduling", label: "Generate Scheduling Reply" },
          ].map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => generateDraft(btn.type)}
              disabled={generating !== null}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {generating === btn.type ? "Generating..." : btn.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Actions</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">No actions yet.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-800">{action.title}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {action.status} · {action.action_type}
                  </p>
                </div>
                {action.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => completeAction(action.id)}
                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-slate-500">No drafts yet.</p>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <DraftCard key={draft.id} draft={draft} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Original messages
        </h2>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs text-slate-500">
                {msg.sender_name ?? "Unknown"} · {msg.source} ·{" "}
                {formatDate(msg.created_at)}
              </p>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {msg.body}
              </pre>
              {msg.extracted_json && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-indigo-600">
                    Extracted JSON
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs">
                    {JSON.stringify(msg.extracted_json, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
