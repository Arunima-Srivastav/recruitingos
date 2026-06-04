"use client";

import Link from "next/link";
import AddToCalendarLinks from "@/components/AddToCalendarLinks";
import type { ActionWithOpportunity } from "@/lib/types";
import { buildCalendarEvents } from "@/lib/calendar/events";
import { buildCalendarExportUrl, buildGoogleCalendarUrl } from "@/lib/calendar/google";
import { getPrimaryReason } from "@/lib/prioritizer";
import { calculatePriority } from "@/lib/prioritizer";
import { formatDate } from "@/lib/utils";

interface Props {
  action: ActionWithOpportunity;
  onComplete: (actionId: string) => void;
  completing?: boolean;
}

export default function ActionCard({
  action,
  onComplete,
  completing,
}: Props) {
  const opp = action.opportunity;
  const priority = calculatePriority({
    stage: opp?.stage,
    action_type: action.action_type,
    deadline: opp?.deadline,
    due_at: action.due_at,
    created_at: action.created_at,
  });

  const calendarEvent =
    action.due_at && action.status === "pending"
      ? buildCalendarEvents([], [action])[0]
      : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              Priority {action.priority_score}
            </span>
            <span className="text-xs text-slate-500 capitalize">
              {action.action_type}
            </span>
          </div>
          <h3 className="font-semibold text-slate-900">{action.title}</h3>
          {action.description && (
            <p className="mt-1 text-sm text-slate-600">{action.description}</p>
          )}
          {opp && (
            <p className="mt-2 text-sm text-slate-700">
              {opp.company ?? "Unknown"} · {opp.role_title ?? "Role TBD"}
            </p>
          )}
          <p className="mt-2 text-xs text-amber-700">
            {getPrimaryReason(priority.reasons)}
          </p>
          {action.due_at && (
            <p className="mt-1 text-xs text-slate-500">
              Due: {formatDate(action.due_at)}
            </p>
          )}
          {calendarEvent && (
            <div className="mt-2">
              <AddToCalendarLinks
                exportHref={buildCalendarExportUrl({ actionId: action.id })}
                googleHref={buildGoogleCalendarUrl(calendarEvent)}
                compact
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {opp && (
            <Link
              href={`/opportunities/${opp.id}`}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              View
            </Link>
          )}
          <button
            type="button"
            onClick={() => onComplete(action.id)}
            disabled={completing}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {completing ? "..." : "Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
