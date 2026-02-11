"use client";

import { useState, useEffect } from "react";
import type {
  DashboardStats,
  RecentActivity,
  RevenueChartData,
} from "@/types";

const MOCK_STATS: DashboardStats = {
  totalUsers: 12480,
  totalMovies: 342,
  totalRevenue: 89420,
  activeSubscriptions: 8920,
  usersGrowth: 12.5,
  moviesGrowth: 8,
  revenueGrowth: 23.4,
};

const MOCK_ACTIVITIES: RecentActivity[] = [
  {
    id: "1",
    type: "user",
    title: "New user registered",
    description: "john.doe@example.com signed up for premium",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "2",
    type: "payment",
    title: "Payment received",
    description: "$29.99 from user#8823 - Monthly subscription",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "3",
    type: "movie",
    title: "Movie published",
    description: '"Midnight Drama" is now live',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "4",
    type: "user",
    title: "Subscription upgraded",
    description: "user#5542 upgraded to lifetime plan",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "5",
    type: "payment",
    title: "Refund processed",
    description: "Refund of $9.99 to user#2210",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

const MOCK_CHART: RevenueChartData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "Revenue",
      data: [12000, 15000, 14000, 18000, 22000, 89420],
      color: "bg-amber-500",
    },
    {
      label: "Subscriptions",
      data: [800, 920, 850, 1100, 1200, 892],
      color: "bg-slate-600",
    },
  ],
};

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
          setStats(data.stats ?? MOCK_STATS);
          setActivities(data.activities ?? MOCK_ACTIVITIES);
          setChartData(data.chartData ?? MOCK_CHART);
        } else {
          setStats(MOCK_STATS);
          setActivities(MOCK_ACTIVITIES);
          setChartData(MOCK_CHART);
        }
      } catch {
        setStats(MOCK_STATS);
        setActivities(MOCK_ACTIVITIES);
        setChartData(MOCK_CHART);
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
