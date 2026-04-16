"use client";

import { Spinner } from "@/components/ui/Spinner";

interface PageLoadingStateProps {
  title?: string;
  description?: string;
  minHeightClass?: string;
  className?: string;
}

export function PageLoadingState({
  title = "Loading workspace",
  description = "Preparing the latest data and layout.",
  minHeightClass = "min-h-[420px]",
  className = "",
}: PageLoadingStateProps) {
  return (
    <div
      className={`${minHeightClass} ${className} overflow-hidden rounded-[32px] border border-slate-200/80 bg-linear-to-br from-white via-slate-50 to-slate-100 dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-800/70`}
    >
      <div className={`flex h-full ${minHeightClass} flex-col items-center justify-center gap-4 px-6 text-center`}>
        <div className="rounded-full border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/90">
          <Spinner size="lg" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  );
}
