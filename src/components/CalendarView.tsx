"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfigErrorBanner from "@/components/ConfigErrorBanner";
import type { DisplayCalendarEvent } from "@/lib/calendar/types";
import type { PipelineCalendarItem } from "@/lib/calendar/pipeline";
import { buildCalendarExportUrl } from "@/lib/calendar/google";
import { formatDate } from "@/lib/utils";

interface CalendarSyncStatus {
  connected: boolean;
  calendarScope: boolean;
  calendarSyncEnabled: boolean;
  googleEmail: string | null;
  lastSyncedAt: string | null;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function eventOccursOnDay(event: DisplayCalendarEvent, day: Date): boolean {
  const dayStart = startOfUtcDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);

  return eventStart < dayEnd && eventEnd > dayStart;
}

function toMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isAppEvent(source: DisplayCalendarEvent["source"]) {
  return source !== "google";
}

function eventBadgeClass(source: DisplayCalendarEvent["source"]) {
  if (source === "google") return "bg-slate-100 text-slate-700";
  return "bg-indigo-100 text-indigo-800";
}

function eventLabel(event: DisplayCalendarEvent) {
  if (event.source === "google") {
    return event.importedToPipeline ? "Google · in pipeline" : "Google Calendar";
  }
  if (event.kind === "deadline") return "Pipeline deadline";
  if (event.kind === "action") return "Pipeline action";
  return "Calendar event";
}

function dateFromEvent(event: DisplayCalendarEvent): string {
  return event.start.slice(0, 10);
}

export default function CalendarView() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [events, setEvents] = useState<DisplayCalendarEvent[]>([]);
  const [pipeline, setPipeline] = useState<PipelineCalendarItem[]>([]);
  const [sync, setSync] = useState<CalendarSyncStatus | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addToGoogle, setAddToGoogle] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/events?year=${year}&month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load calendar");
      setEvents(data.events ?? []);
      setPipeline(data.pipeline ?? []);
      setSync(data.sync ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      setNotice("Google connected. You can sync recruiting events now.");
    }
    const oauthError = params.get("error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
  }, []);

  const monthCells = useMemo(() => {
    const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cells: Array<{ day: number | null; dateKey: string | null }> = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push({ day: null, dateKey: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, dateKey });
    }

    return cells;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DisplayCalendarEvent[]>();
    for (const cell of monthCells) {
      if (!cell.dateKey) continue;
      const dayDate = new Date(`${cell.dateKey}T00:00:00.000Z`);
      map.set(
        cell.dateKey,
        events.filter((event) => eventOccursOnDay(event, dayDate))
      );
    }
    return map;
  }, [events, monthCells]);

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  function shiftMonth(delta: number) {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth() + 1);
    setSelectedDay(null);
  }

  function openAddForm(dateKey?: string | null) {
    const target =
      dateKey ??
      selectedDay ??
      `${year}-${String(month).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    setSelectedDay(target);
    setShowAddForm(true);
    setAddTitle("");
    setAddDescription("");
    setAddToGoogle(Boolean(sync?.calendarScope));
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDay || !addTitle.trim()) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim(),
          description: addDescription.trim() || undefined,
          date: selectedDay,
          addToGoogle: addToGoogle && Boolean(sync?.calendarScope),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add event");
      setNotice(
        addToGoogle && sync?.calendarScope
          ? "Event added here and pushed to Google Calendar."
          : "Event added to your calendar."
      );
      setShowAddForm(false);
      setAddTitle("");
      setAddDescription("");
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFromCalendar(event: DisplayCalendarEvent) {
    if (!window.confirm("Remove this from your calendar?")) return;

    setDeletingId(event.sourceId ?? event.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/calendar/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: event.source === "recruiting" ? "recruiting" : "custom",
          id:
            event.source === "recruiting"
              ? event.sourceId
              : event.sourceId ?? event.id.replace(/^custom-/, ""),
          kind: event.kind,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove");
      setNotice("Removed from calendar.");
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSchedulePipeline(
    item: PipelineCalendarItem,
    date?: string | null
  ) {
    const targetDate =
      date ?? item.date?.slice(0, 10) ?? selectedDay ?? undefined;

    if (!targetDate) {
      setError("Select a day on the calendar first, then add this to the calendar.");
      return;
    }

    setSchedulingId(item.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/calendar/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id:
            item.itemType === "opportunity" ? item.opportunityId : undefined,
          action_id: item.itemType === "action" ? item.id : undefined,
          date: targetDate,
          sync_to_google: Boolean(sync?.calendarScope),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to schedule");
      setNotice(
        data.synced_to_google
          ? "Added to calendar and synced to Google."
          : "Added to your calendar."
      );
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSchedulingId(null);
    }
  }

  async function handleImportToPipeline(event: DisplayCalendarEvent) {
    setImportingId(event.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/calendar/import-to-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          date: dateFromEvent(event),
          google_event_id: event.googleEventId,
          google_html_link: event.googleHtmlLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to import");
      if (data.already_exists) {
        setNotice("Already in your pipeline.");
      } else {
        setNotice("Added to your recruiting pipeline.");
      }
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setImportingId(null);
    }
  }

  async function handleAddRecruitingToGoogle(event: DisplayCalendarEvent) {
    if (!event.kind || !event.sourceId) return;
    await handleSchedulePipeline(
      {
        id: event.sourceId,
        itemType: event.kind === "deadline" ? "opportunity" : "action",
        opportunityId: event.opportunityId ?? event.sourceId,
        title: event.title,
        company: null,
        role: null,
        stage: "New",
        date: event.start,
        onCalendar: true,
        syncedToGoogle: false,
      },
      dateFromEvent(event)
    );
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setNotice(
        `Synced to Google Calendar (${data.created} created, ${data.updated} updated, ${data.removed} removed).`
      );
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const connectUrl =
    "/api/auth/google/start?return_to=/calendar&calendar=1";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-2 text-slate-600">
            One calendar for your pipeline and Google. Schedule pipeline items,
            add events, and pull Google events into your pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openAddForm(selectedDay)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add event
          </button>
          <a
            href={buildCalendarExportUrl()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Download .ics
          </a>
          {!sync?.calendarScope ? (
            <a
              href={connectUrl}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Connect Google Calendar
            </a>
          ) : (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync to Google Calendar"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          Recruiting OS (pipeline + your events)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          Google Calendar
        </span>
        {sync?.googleEmail && (
          <span className="text-slate-500">Connected as {sync.googleEmail}</span>
        )}
        {sync?.lastSyncedAt && (
          <span className="text-slate-500">
            Last sync: {formatDate(sync.lastSyncedAt)}
          </span>
        )}
      </div>

      {notice && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {error && (
        <div className="mt-4">
          <ConfigErrorBanner message={error} />
        </div>
      )}

      {pipeline.length > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Schedule on calendar
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Recruiter chats, call scheduling, and interviews, not OA deadlines or full pipeline
                {selectedDay ? ` · using ${selectedDay}` : " · click a day first"}.
              </p>
            </div>
            <Link
              href="/pipeline"
              className="text-sm font-medium text-indigo-600 hover:underline"
            >
              View full pipeline
            </Link>
          </div>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {pipeline.map((item) => (
              <div
                key={`${item.itemType}-${item.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.company ?? item.title}
                    {item.role ? ` · ${item.role}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.itemType === "opportunity" ? "Opportunity" : "Action"}
                    {" · "}
                    {item.stage}
                    {item.date ? ` · ${formatDate(item.date)}` : " · no date yet"}
                    {item.syncedToGoogle ? " · on Google" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/opportunities/${item.opportunityId}`}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View
                  </Link>
                  {!item.syncedToGoogle && (
                    <button
                      type="button"
                      onClick={() => handleSchedulePipeline(item)}
                      disabled={schedulingId === item.id}
                      className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {schedulingId === item.id
                        ? "Adding..."
                        : item.onCalendar
                          ? "Add to Google"
                          : "Add to calendar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && pipeline.length === 0 && (
        <section className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Nothing to schedule right now. Pipeline items appear here when they are in{" "}
          <strong>Recruiter Chat</strong>, <strong>Interview Scheduling</strong>, or need a
          recruiter call / interview date.
        </section>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ← Prev
          </button>
          <h2 className="text-lg font-semibold text-slate-900">
            {toMonthLabel(year, month)}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Next →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">
            Loading calendar...
          </p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {monthCells.map((cell, index) => {
              if (!cell.day || !cell.dateKey) {
                return <div key={`empty-${index}`} className="min-h-24 rounded-lg" />;
              }

              const dayEvents = eventsByDay.get(cell.dateKey) ?? [];
              const isSelected = selectedDay === cell.dateKey;
              const isToday =
                cell.dateKey ===
                `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => setSelectedDay(cell.dateKey)}
                  className={`min-h-24 rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`mb-2 text-sm font-semibold ${
                      isToday ? "text-indigo-700" : "text-slate-900"
                    }`}
                  >
                    {cell.day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${eventBadgeClass(event.source)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-slate-500">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">
              {new Date(`${selectedDay}T00:00:00.000Z`).toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }
              )}
            </h3>
            <button
              type="button"
              onClick={() => openAddForm(selectedDay)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Add event
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddEvent} className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
              <h4 className="text-sm font-semibold text-indigo-900">New event</h4>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="e.g. Stripe phone screen"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Notes (optional)
                  </label>
                  <textarea
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                {sync?.calendarScope ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={addToGoogle}
                      onChange={(e) => setAddToGoogle(e.target.checked)}
                    />
                    Also add to Google Calendar
                  </label>
                ) : (
                  <p className="text-xs text-slate-500">
                    Connect Google Calendar to push new events there too.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save event"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {selectedEvents.length === 0 && !showAddForm ? (
            <p className="mt-3 text-sm text-slate-500">
              No events on this day. Click <strong>+ Add event</strong> to create one.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${eventBadgeClass(event.source)}`}
                        >
                          {eventLabel(event)}
                        </span>
                        <h4 className="mt-2 font-medium text-slate-900">
                          {event.title}
                        </h4>
                        {event.opportunityId && (
                          <Link
                            href={`/opportunities/${event.opportunityId}`}
                            className="mt-1 inline-block text-sm text-indigo-600 hover:underline"
                          >
                            View opportunity
                          </Link>
                        )}
                        {event.googleHtmlLink && (
                          <a
                            href={event.googleHtmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-sm text-emerald-700 hover:underline"
                          >
                            Open in Google Calendar
                          </a>
                        )}
                        {event.syncedToGoogle && (
                          <p className="mt-1 text-xs text-slate-500">
                            Synced to Google Calendar
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {isAppEvent(event.source) &&
                          event.source === "recruiting" &&
                          sync?.calendarScope &&
                          !event.syncedToGoogle && (
                            <button
                              type="button"
                              onClick={() => handleAddRecruitingToGoogle(event)}
                              disabled={schedulingId === event.sourceId}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {schedulingId === event.sourceId
                                ? "Adding..."
                                : "Add to Google Calendar"}
                            </button>
                          )}
                        {event.source === "google" &&
                          event.canImportToPipeline && (
                            <button
                              type="button"
                              onClick={() => handleImportToPipeline(event)}
                              disabled={importingId === event.id}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {importingId === event.id
                                ? "Adding..."
                                : "Add to pipeline"}
                            </button>
                          )}
                        {event.importedToPipeline && (
                          <span className="text-xs text-indigo-700">
                            Linked to pipeline
                          </span>
                        )}
                        {isAppEvent(event.source) && (
                          <a
                            href={buildCalendarExportUrl(
                              event.kind === "action" && event.sourceId
                                ? { actionId: event.sourceId }
                                : event.opportunityId
                                  ? { opportunityId: event.opportunityId }
                                  : undefined
                            )}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Download .ics
                          </a>
                        )}
                        {event.canRemoveFromCalendar && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCalendar(event)}
                            disabled={deletingId === (event.sourceId ?? event.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === (event.sourceId ?? event.id)
                              ? "Removing..."
                              : "Remove from calendar"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {!loading && events.length === 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="font-medium text-slate-900">No dated events this month</p>
          <p className="mt-2 text-sm text-slate-600">
            Add messages with deadlines, connect Google Calendar to see external
            events, or sync recruiting dates to Google.
          </p>
        </div>
      )}
    </div>
  );
}
