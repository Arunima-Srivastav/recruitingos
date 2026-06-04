"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  MAX_HIGHLIGHTS_TEXT_LENGTH,
  MAX_RESUME_TEXT_LENGTH,
} from "@/lib/draftContext";
import type { UserDraftContext } from "@/lib/types";

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"];

interface Props {
  compact?: boolean;
  showAccountLink?: boolean;
}

export default function DraftContextForm({
  compact = false,
  showAccountLink = false,
}: Props) {
  const [resumeText, setResumeText] = useState("");
  const [highlightsText, setHighlightsText] = useState("");
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/draft-context");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const ctx = data.context as UserDraftContext | null;
      setResumeText(ctx?.resume_text ?? "");
      setHighlightsText(ctx?.highlights_text ?? "");
      setResumeFilename(ctx?.resume_filename ?? null);
      setSavedAt(ctx?.updated_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/draft-context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText || null,
          highlights_text: highlightsText || null,
          resume_filename: resumeFilename,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      const ctx = data.context as UserDraftContext;
      setSavedAt(ctx.updated_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    const allowed = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!allowed) {
      setError("Upload a .pdf, .txt, or .md file, or paste your resume below.");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("File is too large (max 2 MB). Use a smaller file or paste text.");
      e.target.value = "";
      return;
    }

    setParsingFile(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/account/draft-context/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to read file");
      }
      setResumeText((data.text as string).slice(0, MAX_RESUME_TEXT_LENGTH));
      setResumeFilename(data.filename as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setParsingFile(false);
      e.target.value = "";
    }
  }

  const hasContext = Boolean(resumeText.trim() || highlightsText.trim());

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-slate-200 bg-slate-50/80 p-4"
          : "rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            className={
              compact
                ? "text-sm font-semibold text-slate-900"
                : "text-lg font-semibold text-slate-900"
            }
          >
            Resume and highlights for drafts
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Saved to your account and included when Ollama generates reply drafts.
            Upload PDF, .txt, or .md. Text is extracted on the server for drafts.
          </p>
        </div>
        {showAccountLink && compact && (
          <Link
            href="/account"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Open on Account
          </Link>
        )}
      </div>

      {loading && (
        <p className="mt-3 text-xs text-slate-500">Loading saved context...</p>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-700">{error}</p>
      )}

      {!loading && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Upload resume (PDF, .txt, or .md)
            </label>
            <input
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              onChange={handleFileChange}
              disabled={parsingFile}
              className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700 disabled:opacity-50"
            />
            {parsingFile && (
              <p className="mt-1 text-xs text-indigo-600">Extracting text...</p>
            )}
            {resumeFilename && !parsingFile && (
              <p className="mt-1 text-xs text-slate-500">
                Loaded from: {resumeFilename}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Resume text
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={compact ? 5 : 8}
              maxLength={MAX_RESUME_TEXT_LENGTH}
              placeholder="Paste your resume here so drafts can reference your experience and skills."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
            <p className="mt-1 text-xs text-slate-400">
              {resumeText.length.toLocaleString()} /{" "}
              {MAX_RESUME_TEXT_LENGTH.toLocaleString()} characters
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Highlights to emphasize
            </label>
            <textarea
              value={highlightsText}
              onChange={(e) => setHighlightsText(e.target.value)}
              rows={compact ? 3 : 4}
              maxLength={MAX_HIGHLIGHTS_TEXT_LENGTH}
              placeholder="e.g. interested in backend, graduating May 2026, previous internship at X, willing to relocate."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save for drafts"}
            </button>
            {savedAt && (
              <p className="text-xs text-slate-500">
                {hasContext ? "Saved" : "Cleared"} ·{" "}
                {new Date(savedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
