"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { Chart } from "@/components/dashboard/Chart";
import { TopSales } from "@/components/dashboard/TopSales";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { useDashboard } from "@/hooks/useDashboard";
import { DollarSign, Film, ShieldCheck, Users } from "lucide-react";

export default function OverviewPage() {
  const { stats, chartData, topSales, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <PageLoadingState
        title="Loading dashboard overview"
        description="Compiling stats, revenue trends, and top sales."
      />
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Overview
        </h1>
        <p className="mt-1.5 text-slate-600 dark:text-slate-400">
          Welcome back. Here&apos;s what&apos;s happening with your platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers.toLocaleString() ?? "—"}
          trend={
            stats
              ? { value: stats.usersGrowth, label: "vs last month", isPositive: true }
              : undefined
          }
          icon={<Users className="w-6 h-6" />}
        />
        <StatCard
          title="Total Movies"
          value={stats?.totalMovies.toLocaleString() ?? "—"}
          trend={
            stats
              ? { value: stats.moviesGrowth, label: "vs last month", isPositive: true }
              : undefined
          }
          icon={<Film className="w-6 h-6" />}
        />
        <StatCard
          title="Total Revenue"
          value={stats ? `$${stats.totalRevenue.toLocaleString()}` : "—"}
          trend={
            stats
              ? { value: stats.revenueGrowth, label: "vs last month", isPositive: true }
              : undefined
          }
          icon={<DollarSign className="w-6 h-6" />}
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions.toLocaleString() ?? "—"}
          icon={<ShieldCheck className="w-6 h-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {chartData && chartData.labels.length > 0 && (
          <div className="lg:col-span-2">
            <Chart
              data={chartData}
              title="Revenue Overview"
              subtitle="Monthly revenue and subscription counts"
            />
          </div>
        )}
        <div className={chartData && chartData.labels.length > 0 ? "lg:col-span-1" : "lg:col-span-3"}>
          <TopSales items={topSales} />
        </div>
      </div>
    </div>
  );
}
