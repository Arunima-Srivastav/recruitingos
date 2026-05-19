import type { Opportunity } from "@/lib/types";
import OpportunityCard from "./OpportunityCard";
import { STAGE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  stage: string;
  opportunities: Opportunity[];
  onStageChange: (id: string, stage: string) => void;
}

export default function StageColumn({
  stage,
  opportunities,
  onStageChange,
}: Props) {
  const stageColor =
    STAGE_COLORS[stage] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-100/50">
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
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {opportunities.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No items</p>
        ) : (
          opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              showStageSelect
              onStageChange={(newStage) => onStageChange(opp.id, newStage)}
            />
          ))
        )}
      </div>
    </div>
  );
}
