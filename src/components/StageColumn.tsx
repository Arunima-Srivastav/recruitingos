"use client";

import { useState } from "react";
import type { Opportunity } from "@/lib/types";
import OpportunityCard, { OPPORTUNITY_DRAG_TYPE } from "./OpportunityCard";
import { STAGE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  stage: string;
  opportunities: Opportunity[];
  onStageChange: (id: string, stage: string) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

function readDraggedOpportunityId(e: React.DragEvent): string | null {
  return (
    e.dataTransfer.getData(OPPORTUNITY_DRAG_TYPE) ||
    e.dataTransfer.getData("text/plain") ||
    null
  );
}

export default function StageColumn({
  stage,
  opportunities,
  onStageChange,
  onDelete,
  deletingId,
  draggingId,
  onDragStart,
  onDragEnd,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const stageColor =
    STAGE_COLORS[stage] ?? "bg-slate-100 text-slate-700";

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const opportunityId = readDraggedOpportunityId(e);
    if (!opportunityId) return;
    onStageChange(opportunityId, stage);
  }

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-slate-100/50 transition-colors",
        isDragOver
          ? "border-indigo-400 bg-indigo-50/80 ring-2 ring-indigo-200"
          : "border-slate-200"
      )}
      onDragOver={handleDragOver}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false);
        }
      }}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            stageColor
          )}
        >
          {stage}
        </span>
        <span className="text-xs font-medium text-slate-500">
          {opportunities.length}
        </span>
      </div>
      <div
        className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        {opportunities.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            {isDragOver ? "Drop here" : "No items"}
          </p>
        ) : (
          opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              showStageSelect
              draggable
              isDragging={draggingId === opp.id}
              onDragStart={() => onDragStart(opp.id)}
              onDragEnd={onDragEnd}
              onStageChange={(newStage) => onStageChange(opp.id, newStage)}
              onDelete={() => onDelete(opp.id)}
              deleting={deletingId === opp.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
