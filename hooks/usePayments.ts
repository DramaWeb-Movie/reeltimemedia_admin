"use client";

import { useState, useEffect } from "react";
import type { Payment, PaymentStats } from "@/types";

export function usePayments(descriptionFilter?: string, page = 1) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (descriptionFilter) params.set("description", descriptionFilter);
        params.set("page", String(page));
        const [paymentsRes, statsRes] = await Promise.all([
          fetch(`/api/payments?${params}`),
          fetch("/api/payments/stats"),
        ]);
        if (paymentsRes.ok) {
          const data = await paymentsRes.json();
          setPayments(data.payments ?? []);
          setTotal(data.pagination?.total ?? 0);
          setTotalPages(data.pagination?.totalPages ?? 1);
        } else {
          setPayments([]);
          setTotal(0);
          setTotalPages(1);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats ?? null);
        } else {
          setStats(null);
        }
      } catch {
        setPayments([]);
        setTotal(0);
        setTotalPages(1);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [descriptionFilter, page]);

  return { payments, stats, isLoading, total, totalPages };
}
