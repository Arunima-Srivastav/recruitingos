import Link from "next/link";
import { buildCalendarExportUrl } from "@/lib/calendar/google";

interface Props {
  exportHref?: string;
  googleHref: string;
  compact?: boolean;
}

export default function AddToCalendarLinks({
  exportHref = "/api/calendar/export",
  googleHref,
  compact = false,
}: Props) {
  return (
    <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-3"}>
      <a
        href={exportHref}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Download .ics
      </a>
      <a
        href={googleHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Google Calendar
      </a>
      {!compact && (
        <Link
          href="/calendar"
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          View all events
        </Link>
      )}
    </div>
  );
}

export function buildOpportunityExportHref(opportunityId: string): string {
  return buildCalendarExportUrl({ opportunityId });
}

export function buildActionExportHref(actionId: string): string {
  return buildCalendarExportUrl({ actionId });
}
