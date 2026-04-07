"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { TopSaleMovie } from "@/types";
import { TrendingUp } from "lucide-react";

interface TopSalesProps {
  items: TopSaleMovie[];
  title?: string;
  subtitle?: string;
}

export function TopSales({
  items,
  title = "Top sales",
  subtitle = "Movies with the most completed purchases",
}: TopSalesProps) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      {items.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400 px-1 pb-1">
          No ranked sales yet. Completed payments need a movie reference (such as a movie ID
          column, JSON metadata, or a description that matches a movie title).
        </p>
      ) : (
        <ul className="space-y-0 divide-y divide-slate-200/80 dark:divide-slate-700/80">
          {items.map((item, index) => (
            <li
              key={item.movieId}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-sm font-semibold text-red-600 dark:text-red-400">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 dark:text-white truncate">
                  {item.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                <TrendingUp className="w-4 h-4" aria-hidden />
                <span className="text-sm font-semibold tabular-nums">
                  {item.salesCount === 1 ? "1 sale" : `${item.salesCount.toLocaleString()} sales`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
