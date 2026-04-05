"use client";

import { useState } from "react";
import { PaymentStats } from "@/components/payments/PaymentStats";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import { PaymentTable } from "@/components/payments/PaymentTable";
import { usePayments } from "@/hooks/usePayments";
import { Button } from "@/components/ui/Button";

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

export default function PaymentsPage() {
  const [descriptionType, setDescriptionType] = useState("");
  const [page, setPage] = useState(1);
  const { payments, stats, isLoading, total, totalPages } = usePayments(
    descriptionType || undefined,
    page
  );
  const pageItems = buildPageItems(page, totalPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payments</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Track transactions and revenue.
        </p>
      </div>

      {stats && <PaymentStats stats={stats} />}

      <PaymentFilters
        descriptionType={descriptionType}
        onDescriptionTypeChange={(value) => {
          setDescriptionType(value);
          setPage(1);
        }}
      />

      <PaymentTable payments={payments} isLoading={isLoading} />

      {!isLoading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {pageItems.map((item, index) => {
                if (typeof item !== "number") {
                  return (
                    <span
                      key={`${item}-${index}`}
                      className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500"
                    >
                      ...
                    </span>
                  );
                }

                const isActive = item === page;
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
