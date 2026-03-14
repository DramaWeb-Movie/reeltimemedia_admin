"use client";

import { useState } from "react";
import { PaymentStats } from "@/components/payments/PaymentStats";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import { PaymentTable } from "@/components/payments/PaymentTable";
import { usePayments } from "@/hooks/usePayments";
import { Button } from "@/components/ui/Button";

const PER_PAGE = 20;

export default function PaymentsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { payments, stats, isLoading, total, totalPages } = usePayments(
    status || undefined,
    page
  );

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
        status={status}
        onStatusChange={(s) => {
          setStatus(s);
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
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
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
