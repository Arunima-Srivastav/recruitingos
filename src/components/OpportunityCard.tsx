"use client";

import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import { STAGE_COLORS, STAGES } from "@/lib/constants";
import { normalizeStoredPriorityScore } from "@/lib/prioritizer";
import { formatDate, formatRelative, cn } from "@/lib/utils";

const OPPORTUNITY_DRAG_TYPE = "application/x-opportunity-id";

interface Props {
  opportunity: Opportunity;
  onStageChange?: (stage: string) => void;
  onDelete?: () => void;
  deleting?: boolean;
  showStageSelect?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export { OPPORTUNITY_DRAG_TYPE };

export default function OpportunityCard({
  opportunity,
  onStageChange,
  onDelete,
  deleting,
  showStageSelect = false,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: Props) {
  const stageColor =
    STAGE_COLORS[opportunity.stage] ?? "bg-slate-100 text-slate-700";

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData(OPPORTUNITY_DRAG_TYPE, opportunity.id);
    e.dataTransfer.setData("text/plain", opportunity.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.();
  }

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-indigo-300"
      )}
    >
      <Link
        href={`/opportunities/${opportunity.id}`}
        className="block"
        draggable={false}
      >
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
            {normalizeStoredPriorityScore(opportunity.priority_score)}/10
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
