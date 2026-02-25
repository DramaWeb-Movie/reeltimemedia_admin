"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { Chart } from "@/components/dashboard/Chart";
import { Spinner } from "@/components/ui/Spinner";
import { useDashboard } from "@/hooks/useDashboard";

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SubscriptionIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export default function OverviewPage() {
  const { stats, chartData, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
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
          icon={<UsersIcon />}
        />
        <StatCard
          title="Total Movies"
          value={stats?.totalMovies.toLocaleString() ?? "—"}
          trend={
            stats
              ? { value: stats.moviesGrowth, label: "vs last month", isPositive: true }
              : undefined
          }
          icon={<FilmIcon />}
        />
        <StatCard
          title="Total Revenue"
          value={stats ? `$${stats.totalRevenue.toLocaleString()}` : "—"}
          trend={
            stats
              ? { value: stats.revenueGrowth, label: "vs last month", isPositive: true }
              : undefined
          }
          icon={<DollarIcon />}
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions.toLocaleString() ?? "—"}
          icon={<SubscriptionIcon />}
        />
      </div>

      {chartData && chartData.labels.length > 0 && (
        <Chart
          data={chartData}
          title="Revenue Overview"
          subtitle="Monthly revenue and subscription counts"
        />
      )}
    </div>
  );
}
