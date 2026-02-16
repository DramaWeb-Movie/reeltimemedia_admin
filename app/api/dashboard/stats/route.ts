import { NextResponse } from "next/server";
import type {
  DashboardStats,
  RecentActivity,
  RevenueChartData,
} from "@/types";

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  totalMovies: 0,
  totalRevenue: 0,
  activeSubscriptions: 0,
  usersGrowth: 0,
  moviesGrowth: 0,
  revenueGrowth: 0,
};

export async function GET() {
  try {
    // TODO: replace with real data from Supabase when dashboard tables exist
    const stats: DashboardStats = EMPTY_STATS;
    const activities: RecentActivity[] = [];
    const chartData: RevenueChartData = { labels: [], datasets: [] };

    return NextResponse.json({
      stats,
      activities,
      chartData,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
