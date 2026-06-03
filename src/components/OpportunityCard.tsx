"use client";

import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import { STAGE_COLORS, STAGES } from "@/lib/constants";
import { formatDate, formatRelative, cn } from "@/lib/utils";

interface Props {
  opportunity: Opportunity;
  onStageChange?: (stage: string) => void;
  onDelete?: () => void;
  deleting?: boolean;
  showStageSelect?: boolean;
}

export default function OpportunityCard({
  opportunity,
  onStageChange,
  onDelete,
  deleting,
  showStageSelect = false,
}: Props) {
  const stageColor =
    STAGE_COLORS[opportunity.stage] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/opportunities/${opportunity.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-900">
              {opportunity.company ?? "Unknown Company"}
            </h3>
            <p className="text-sm text-slate-600">
              {opportunity.role_title ?? "Unknown Role"}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              stageColor
            )}
          >
            P{opportunity.priority_score}
          </span>
        </div>
        <p className="mt-2 text-xs capitalize text-slate-500">
          Source: {opportunity.source.replace("_", " ")}
        </p>
        {opportunity.next_action && (
          <p className="mt-2 line-clamp-2 text-sm text-indigo-700">
            → {opportunity.next_action}
          </p>
        )}
        {opportunity.deadline && (
          <p className="mt-1 text-xs text-amber-700">
            Deadline: {formatDate(opportunity.deadline)}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Updated {formatRelative(opportunity.updated_at)}
        </p>
      </Link>
      {showStageSelect && onStageChange && (
        <div className="mt-3 flex items-center gap-2">
          <select
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
            value={opportunity.stage}
            onChange={(e) => onStageChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              disabled={deleting}
              className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "..." : "Delete"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
