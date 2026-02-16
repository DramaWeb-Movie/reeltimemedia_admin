"use client";

import { useState, useEffect } from "react";
import type {
  DashboardStats,
  RecentActivity,
  RevenueChartData,
} from "@/types";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<RevenueChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats ?? null);
          setActivities(data.activities ?? []);
          setChartData(data.chartData ?? null);
        } else {
          setStats(null);
          setActivities([]);
          setChartData(null);
        }
      } catch {
        setStats(null);
        setActivities([]);
        setChartData(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return {
    stats,
    activities,
    chartData,
    isLoading,
  };
}
