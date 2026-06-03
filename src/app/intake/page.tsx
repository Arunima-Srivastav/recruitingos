"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STAGES, SOURCES } from "@/lib/constants";
import type { ExtractedRecruitingData } from "@/lib/types";

export default function IntakePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [source, setSource] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractedRecruitingData | null>(
    null
  );
  const [provider, setProvider] = useState<string | null>(null);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please paste a message to process.");
      return;
    }

    setLoading(true);
    setError(null);
    setExtraction(null);

    try {
      const res = await fetch("/api/ai/extract-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text, sourceType: source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to extract message");
      setExtraction(data.extraction);
      setProvider(data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!extraction) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source, extracted: extraction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save opportunity");
      router.push(`/opportunities/${data.opportunity_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof ExtractedRecruitingData>(
    key: K,
    value: ExtractedRecruitingData[K]
  ) {
    setExtraction((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Add Message</h1>
      <p className="mt-2 text-slate-600">
        Paste a recruiter email, LinkedIn message, job posting, OA notice, or
        scheduling email. AI extraction runs via Ollama Cloud when configured.
      </p>

      <form onSubmit={handleExtract} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Message
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder={`Example:\n\nHi Arunima,\n\nI'm a recruiter at Acme Corp. Would you be interested in our Software Engineer internship? Let me know if you'd like to schedule a call.\n\nBest,\nJane`}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Extracting..." : "Extract with AI"}
        </button>
      </form>

      {extraction && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Review extraction
            </h2>
            {provider && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {provider === "ollama" ? "Ollama Cloud" : "Heuristic fallback"}
              </span>
            )}
            {extraction.needs_review && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Needs review
              </span>
            )}
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
              Confidence {(extraction.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {extraction.explanation && (
            <p className="mb-4 text-sm text-slate-600">
              {extraction.explanation}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Company"
              value={extraction.company ?? ""}
              onChange={(v) => updateField("company", v || null)}
            />
            <Field
              label="Role"
              value={extraction.role_title ?? ""}
              onChange={(v) => updateField("role_title", v || null)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Pipeline stage
              </label>
              <select
                value={extraction.stage}
                onChange={(e) => updateField("stage", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Deadline"
              value={extraction.deadline ?? ""}
              onChange={(v) => updateField("deadline", v || null)}
              placeholder="2026-03-28 or ISO date"
            />
            <Field
              label="Recruiter name"
              value={extraction.recruiter_name ?? ""}
              onChange={(v) => updateField("recruiter_name", v || null)}
            />
            <Field
              label="Recruiter email"
              value={extraction.recruiter_email ?? ""}
              onChange={(v) => updateField("recruiter_email", v || null)}
            />
            <Field
              label="Location"
              value={extraction.location ?? ""}
              onChange={(v) => updateField("location", v || null)}
              className="sm:col-span-2"
            />
            <Field
              label="Next action"
              value={extraction.next_action ?? ""}
              onChange={(v) => updateField("next_action", v || null)}
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save to pipeline"}
            </button>
            <button
              type="button"
              onClick={() => setExtraction(null)}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Re-extract
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  );
}
