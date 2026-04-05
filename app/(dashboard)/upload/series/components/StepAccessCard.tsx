import { memo } from "react";
import { Card } from "@/components/ui/Card";

type SeriesAccess = "membership" | "free";

type StepAccessCardProps = {
  seriesAccess: SeriesAccess;
  onSeriesAccessChange: (value: SeriesAccess) => void;
};

export const StepAccessCard = memo(function StepAccessCard({
  seriesAccess,
  onSeriesAccessChange,
}: StepAccessCardProps) {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 1: Access</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">How will users watch this series?</p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onSeriesAccessChange("membership")}
          className={`flex-1 p-6 rounded-xl border-2 text-left transition-all ${
            seriesAccess === "membership"
              ? "border-red-500 bg-red-500/10 text-slate-900 dark:text-white"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-400"
          }`}
        >
          <span className="font-semibold block">Subscribers only</span>
          <span className="text-sm mt-1 block">Only users with an active subscription (any plan) can watch. Mark which episodes are free to preview in Step 3.</span>
        </button>
        <button
          type="button"
          onClick={() => onSeriesAccessChange("free")}
          className={`flex-1 p-6 rounded-xl border-2 text-left transition-all ${
            seriesAccess === "free"
              ? "border-red-500 bg-red-500/10 text-slate-900 dark:text-white"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-400"
          }`}
        >
          <span className="font-semibold block">Free for all</span>
          <span className="text-sm mt-1 block">No subscription needed. Everyone can watch all episodes.</span>
        </button>
      </div>
    </Card>
  );
});
