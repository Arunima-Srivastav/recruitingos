"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SOURCES } from "@/lib/constants";

export default function IntakePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [source, setSource] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please paste a message to process.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to process message");
      router.push(`/opportunities/${data.opportunity_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Add Message</h1>
      <p className="mt-2 text-slate-600">
        Paste a recruiter email, LinkedIn message, job posting, OA notice, or
        scheduling email.
      </p>
      <p className="mt-3 inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
        MVP: uses heuristic extraction (regex/keywords), not an LLM yet
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Process Message"}
        </button>
      </form>
    </div>
  );
}
