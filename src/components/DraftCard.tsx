"use client";

import { useState } from "react";
import type { Draft } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function DraftCard({ draft }: { draft: Draft }) {
  const [copied, setCopied] = useState(false);

  async function copyDraft() {
    await navigator.clipboard.writeText(draft.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold capitalize text-slate-800">
            {draft.draft_type.replace("_", " ")}
          </span>
          <span className="ml-2 text-xs text-slate-500">· {draft.tone}</span>
        </div>
        <button
          type="button"
          onClick={copyDraft}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        {draft.body}
      </pre>
      <p className="mt-2 text-xs text-slate-400">{formatDate(draft.created_at)}</p>
    </div>
  );
}
