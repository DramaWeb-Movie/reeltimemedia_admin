"use client";

import Link from "next/link";
import { ArrowRight, Clapperboard, Film } from "lucide-react";

export default function MoviesPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Movies
        </h1>
        <p className="mt-1.5 text-slate-600 dark:text-slate-400">
          Choose a category to manage your content.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
        <Link
          href="/movies/single"
          className="group flex items-center gap-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-6 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600/50 transition-all duration-200"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
            <Film className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Single Movies
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              One-time purchase titles
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 shrink-0 transition-colors" />
        </Link>

        <Link
          href="/movies/series"
          className="group flex items-center gap-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-6 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600/50 transition-all duration-200"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
            <Clapperboard className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Series
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Subscription-based series
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 shrink-0 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
