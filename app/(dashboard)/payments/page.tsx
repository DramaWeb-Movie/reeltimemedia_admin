"use client";

import { useState } from "react";
import { PaymentStats } from "@/components/payments/PaymentStats";
import { PaymentFilters } from "@/components/payments/PaymentFilters";
import { PaymentList } from "@/components/payments/PaymentList";
import { usePayments } from "@/hooks/usePayments";

export default function PaymentsPage() {
  const [status, setStatus] = useState("");
  const { payments, stats, isLoading } = usePayments(status || undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="mt-1 text-slate-400">
          Track transactions and revenue.
        </p>
      </div>

      {stats && <PaymentStats stats={stats} />}

      <PaymentFilters status={status} onStatusChange={setStatus} />

      <PaymentList payments={payments} isLoading={isLoading} />
    </div>
  );
}
