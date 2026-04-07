"use client";

import { useState, useEffect } from "react";
import type {
  DashboardStats,
  RecentActivity,
  RevenueChartData,
  TopSaleMovie,
} from "@/types";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<RevenueChartData | null>(null);
  const [topSales, setTopSales] = useState<TopSaleMovie[]>([]);
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
          setTopSales(data.topSales ?? []);
        } else {
          setStats(null);
          setActivities([]);
          setChartData(null);
          setTopSales([]);
        }
      } catch {
        setStats(null);
        setActivities([]);
        setChartData(null);
        setTopSales([]);
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
    topSales,
    isLoading,
  };
}
