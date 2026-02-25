"use client";

import Link from "next/link";

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  );
}

function CollectionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

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
            <FilmIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Single Movies
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              One-time purchase titles
            </p>
          </div>
          <ArrowIcon className="h-5 w-5 text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 shrink-0 transition-colors" />
        </Link>

        <Link
          href="/movies/series"
          className="group flex items-center gap-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-6 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600/50 transition-all duration-200"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
            <CollectionIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Series
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Subscription-based series
            </p>
          </div>
          <ArrowIcon className="h-5 w-5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 shrink-0 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
