"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ConfigErrorBanner from "@/components/ConfigErrorBanner";

interface GmailStatus {
  configured: boolean;
  connected: boolean;
  google_email: string | null;
  error?: string;
}

interface ScanMessage {
  id: string;
  subject: string | null;
  senderName: string | null;
  senderEmail: string | null;
  snippet: string | null;
  receivedAt: string | null;
  alreadyImported: boolean;
  previewCategory: string | null;
  previewCompany: string | null;
  previewStage: string | null;
}

type ScanRange = "7d" | "30d" | "unread" | "custom";

export default function GmailPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm text-slate-500">Loading Gmail...</div>
      }
    >
      <GmailImportContent />
    </Suspense>
  );
}

function GmailImportContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [range, setRange] = useState<ScanRange>("7d");
  const [customQuery, setCustomQuery] = useState("");
  const [messages, setMessages] = useState<ScanMessage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/gmail/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ configured: false, connected: false, google_email: null });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setNotice("Gmail connected successfully.");
    }
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
  }, [searchParams]);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setNotice(null);
    setMessages([]);
    setSelected(new Set());

    try {
      const res = await fetch("/api/gmail/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range, customQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setMessages(data.messages ?? []);
      const selectable = (data.messages as ScanMessage[])
        .filter((m) => !m.alreadyImported)
        .map((m) => m.id);
      setSelected(new Set(selectable));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/gmail/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setNotice(
        `Imported ${data.imported} message(s)${data.skipped ? `, skipped ${data.skipped} duplicate(s)` : ""}.`
      );
      await handleScan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    const res = await fetch("/api/gmail/disconnect", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to disconnect");
      return;
    }
    setNotice("Gmail disconnected.");
    setMessages([]);
    setSelected(new Set());
    await loadStatus();
  }

  function toggleSelected(id: string, disabled: boolean) {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectableIds = messages
    .filter((m) => !m.alreadyImported)
    .map((m) => m.id);

  function selectAll() {
    setSelected(new Set(selectableIds));
  }

  function unselectAll() {
    setSelected(new Set());
  }

  const setupError = status?.error;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Gmail Import</h1>
      <p className="mt-2 text-slate-600">
        Connect Gmail, scan for recruiting-related messages, review them, then
        import only what you select.
      </p>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium">Privacy</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Only messages you select are imported and stored.</li>
          <li>Original message text is saved for review and auditability.</li>
          <li>Read-only Gmail access. Nothing is sent or deleted.</li>
        </ul>
      </div>

      {notice && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {setupError && (
        <div className="mt-4">
          <ConfigErrorBanner message={setupError} />
        </div>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Connection</h2>
        {loadingStatus ? (
          <p className="mt-2 text-sm text-slate-500">Checking status...</p>
        ) : status?.connected ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
              Connected
            </span>
            <span className="text-sm text-slate-600">
              {status.google_email ?? "Gmail account"}
            </span>
            <button
              type="button"
              onClick={handleDisconnect}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-slate-600">Gmail is not connected.</p>
            <a
              href="/api/auth/google/start"
              className="mt-3 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Connect Gmail
            </a>
          </div>
        )}
      </section>

      {status?.connected && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Scan inbox</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {(
              [
                ["7d", "Last 7 days"],
                ["30d", "Last 30 days"],
                ["unread", "Unread only"],
                ["custom", "Custom query"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  range === value
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Additional Gmail search terms"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          )}

          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan Gmail"}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Scanning fetches up to 20 messages sequentially to avoid Gmail rate
            limits. This may take 10–20 seconds.
          </p>
        </section>
      )}

      {messages.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Import preview ({messages.length})
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                disabled={selectableIds.length === 0}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={unselectAll}
                disabled={selected.size === 0}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Unselect all
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing
                  ? "Importing..."
                  : `Import selected (${selected.size})`}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {messages.map((msg) => {
              const disabled = msg.alreadyImported;
              const checked = selected.has(msg.id);
              return (
                <label
                  key={msg.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${
                    disabled
                      ? "border-slate-100 bg-slate-50 opacity-70"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleSelected(msg.id, disabled)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {msg.subject ?? "(No subject)"}
                      </p>
                      {msg.previewCategory && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {msg.previewCategory}
                        </span>
                      )}
                      {disabled && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Already imported
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {msg.senderName ?? msg.senderEmail ?? "Unknown sender"}
                      {msg.receivedAt &&
                        ` · ${new Date(msg.receivedAt).toLocaleDateString()}`}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{msg.snippet}</p>
                    {(msg.previewCompany || msg.previewStage) && (
                      <p className="mt-2 text-xs text-indigo-700">
                        Preview: {msg.previewCompany ?? "Unknown company"} ·{" "}
                        {msg.previewStage ?? "Unknown stage"} (heuristic preview;
                        Ollama runs on import)
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Imported messages run through Ollama extraction and appear in your{" "}
            <Link href="/pipeline" className="text-indigo-600 hover:underline">
              pipeline
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
