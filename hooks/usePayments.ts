"use client";

import { useState, useEffect } from "react";
import type { Payment, PaymentStats } from "@/types";

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
          setPayments(data.payments ?? []);
        } else {
          setPayments([]);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats ?? null);
        } else {
          setStats(null);
        }
      } catch {
        setPayments([]);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [statusFilter]);

  return { payments, stats, isLoading };
}
