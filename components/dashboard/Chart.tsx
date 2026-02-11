"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { RevenueChartData } from "@/types";

interface ChartProps {
  data: RevenueChartData;
  title?: string;
  subtitle?: string;
}

export function Chart({ data, title = "Revenue", subtitle }: ChartProps) {
  const maxValue = Math.max(...data.datasets.flatMap((d) => d.data), 1);

  return (
    <Card>
      {(title || subtitle) && (
        <CardHeader title={title} subtitle={subtitle} />
      )}
      <div className="h-64 flex items-end gap-2">
        {data.labels.map((label, i) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center gap-2 min-w-0"
          >
            <div className="w-full flex gap-1 items-end justify-center h-48">
              {data.datasets.map((dataset, j) => {
                const height = (dataset.data[i] / maxValue) * 100;
                const color =
                  dataset.color ?? (j === 0 ? "bg-amber-500" : "bg-slate-600");
                return (
                  <div
                    key={j}
                    className={`flex-1 max-w-8 rounded-t ${color} transition-all duration-500 min-h-[4px]`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${label}: $${dataset.data[i].toLocaleString()}`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-slate-500 truncate max-w-full">
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 flex-wrap">
        {data.datasets.map((dataset, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded ${
                dataset.color ?? (i === 0 ? "bg-amber-500" : "bg-slate-600")
              }`}
            />
            <span className="text-sm text-slate-400">{dataset.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
