"use client";

import { useState, useMemo } from "react";
import { useMovieSales } from "@/hooks/useMovieSales";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { Spinner } from "@/components/ui/Spinner";
import {
  addDaysLocal,
  defaultMonthToDateRange,
  endOfDayLocal,
  formatDateInputLocal,
  startOfDayLocal,
} from "@/lib/sales/date-range-local";

const PER_PAGE = 20;

type PageItem = number | "ellipsis-left" | "ellipsis-right";

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
}

export default function SalesPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const validationError = useMemo(() => {
    if (fromDate && toDate && fromDate > toDate) {
      return "Start date must be on or before end date.";
    }
    return null;
  }, [fromDate, toDate]);

  const rangeStartIso = useMemo(() => {
    if (validationError || !fromDate) return null;
    return startOfDayLocal(fromDate).toISOString();
  }, [fromDate, validationError]);

  const rangeEndIso = useMemo(() => {
    if (validationError || !toDate) return null;
    return endOfDayLocal(toDate).toISOString();
  }, [toDate, validationError]);

  const { data, isLoading, fetchError } = useMovieSales(rangeStartIso, rangeEndIso, page);

  const totalPages = data?.pagination.totalPages ?? 1;
  const pageItems = useMemo(
    () => buildPageItems(data?.pagination.page ?? 1, totalPages),
    [data?.pagination.page, totalPages]
  );

  const applyPreset = (preset: "today" | "week" | "month") => {
    const today = formatDateInputLocal(new Date());
    if (preset === "today") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "week") {
      setToDate(today);
      setFromDate(addDaysLocal(today, -6));
    } else {
      const m = defaultMonthToDateRange();
      setFromDate(m.from);
      setToDate(m.to);
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales by movie</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Completed purchases per title. By default this shows all-time data; use filters to narrow it.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div className="flex-1 min-w-[140px]">
            <Input
              label="From"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Input
              label="To"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              max={formatDateInputLocal(new Date())}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        {validationError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {validationError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 self-center mr-1">
            Quick ranges
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("today")}>
            Today
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("week")}>
            Last 7 days
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("month")}>
            Month to date
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
          >
            All time
          </Button>
        </div>
      </Card>

      {fetchError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {fetchError}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableHead className="w-14">#</TableHead>
          <TableHead>Movie</TableHead>
          <TableHead className="text-right w-32">Sales</TableHead>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <td colSpan={3} className="px-6 py-16 text-center">
                <Spinner size="lg" />
              </td>
            </TableRow>
          ) : !data?.items.length ? (
            <TableEmpty colSpan={3} message="No movie-linked sales in this date range." />
          ) : (
            data.items.map((row, i) => {
              const rank = (data.pagination.page - 1) * PER_PAGE + i + 1;
              return (
                <TableRow key={row.movieId}>
                  <TableCell className="text-slate-500 dark:text-slate-400 tabular-nums">{rank}</TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-white">{row.title}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {row.salesCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {!isLoading && data && data.pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {(data.pagination.page - 1) * PER_PAGE + 1}–
            {Math.min(data.pagination.page * PER_PAGE, data.pagination.total)} of {data.pagination.total} titles
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.pagination.page <= 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {pageItems.map((item, index) => {
                if (typeof item !== "number") {
                  return (
                    <span key={`${item}-${index}`} className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500">
                      ...
                    </span>
                  );
                }
                const isActive = item === data.pagination.page;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`min-w-8 rounded-md px-2 py-1.5 text-xs border transition-colors ${
                      isActive
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={data.pagination.page >= data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
