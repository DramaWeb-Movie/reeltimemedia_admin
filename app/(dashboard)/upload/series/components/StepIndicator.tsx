import { memo } from "react";

const STEPS = [
  { id: 1, title: "Access" },
  { id: 2, title: "Details" },
  { id: 3, title: "Episodes" },
  { id: 4, title: "Review" },
] as const;

type StepIndicatorProps = {
  step: number;
  onStepChange: (step: number) => void;
};

export const StepIndicator = memo(function StepIndicator({
  step,
  onStepChange,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onStepChange(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              step === s.id
                ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                : step > s.id
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  : "text-slate-500 dark:text-slate-600"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= s.id ? "bg-red-500/30 text-red-600 dark:text-red-400" : "bg-slate-200 dark:bg-slate-700"}`}>
              {s.id}
            </span>
            {s.title}
          </button>
          {i < STEPS.length - 1 && (
            <svg className="w-4 h-4 text-slate-400 mx-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
});
