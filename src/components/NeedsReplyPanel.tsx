import Link from "next/link";
import type { NeedsReplyItem } from "@/lib/replies/detect";

interface Props {
  items: NeedsReplyItem[];
  compact?: boolean;
}

export default function NeedsReplyPanel({ items, compact }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-amber-200 bg-amber-50/60 p-4"
          : "mb-8 rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Needs your reply
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Detected from pending reply actions and recruiter messages waiting on
            you.
          </p>
        </div>
        {!compact && (
          <Link
            href="/today"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            View on Today
          </Link>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {item.company ?? "Unknown company"}
                {item.role ? ` · ${item.role}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">{item.reason}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/opportunities/${item.opportunityId}`}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Open
              </Link>
              <Link
                href={`/opportunities/${item.opportunityId}#drafts`}
                className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Draft reply
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
