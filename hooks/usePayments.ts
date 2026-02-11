"use client";

import { useState, useEffect } from "react";
import type { Payment, PaymentStats } from "@/types";

const MOCK_PAYMENTS: Payment[] = [
  {
    id: "1",
    user_id: "1",
    amount: 29.99,
    currency: "USD",
    payment_method: "credit_card",
    payment_status: "completed",
    transaction_id: "txn_abc123",
    description: "Monthly subscription",
    created_at: "2024-02-10T14:30:00Z",
    user: { email: "john.doe@example.com", full_name: "John Doe" },
  },
  {
    id: "2",
    user_id: "2",
    amount: 9.99,
    currency: "USD",
    payment_method: "paypal",
    payment_status: "pending",
    transaction_id: null,
    description: "Single movie purchase",
    created_at: "2024-02-09T10:00:00Z",
    user: { email: "jane.smith@example.com", full_name: "Jane Smith" },
  },
  {
    id: "3",
    user_id: "3",
    amount: 199.99,
    currency: "USD",
    payment_method: "credit_card",
    payment_status: "completed",
    transaction_id: "txn_def456",
    description: "Lifetime subscription",
    created_at: "2024-02-08T16:45:00Z",
    user: { email: "alex@example.com", full_name: "Alex Johnson" },
  },
];

const MOCK_STATS: PaymentStats = {
  totalRevenue: 89420,
  pendingAmount: 1250,
  completedCount: 3420,
  failedCount: 23,
};

export function usePayments(statusFilter?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = statusFilter ? `?status=${statusFilter}` : "";
        const [paymentsRes, statsRes] = await Promise.all([
          fetch(`/api/payments${params}`),
          fetch("/api/payments/stats"),
        ]);
        if (paymentsRes.ok) {
          const data = await paymentsRes.json();
          setPayments(data.payments ?? MOCK_PAYMENTS);
        } else {
          setPayments(MOCK_PAYMENTS);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats ?? MOCK_STATS);
        } else {
          setStats(MOCK_STATS);
        }
      } catch {
        setPayments(MOCK_PAYMENTS);
        setStats(MOCK_STATS);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [statusFilter]);

  return { payments, stats, isLoading };
}
