import { NextResponse } from "next/server";
import type {
  DashboardStats,
  RecentActivity,
  RevenueChartData,
} from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  totalMovies: 0,
  totalRevenue: 0,
  activeSubscriptions: 0,
  usersGrowth: 0,
  moviesGrowth: 0,
  revenueGrowth: 0,
};

async function getTotalUsers(supabase: ReturnType<typeof createAdminClient>): Promise<number> {
  let total = 0;
  let page = 1;
  const perPage = 1000;
  const maxPages = 20;

  while (page <= maxPages) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) return 0;
    const users = data.users ?? [];
    total += users.length;
    if (users.length < perPage) break;
    page += 1;
  }
  return total;
}

async function getUsersForActivity(
  supabase: ReturnType<typeof createAdminClient>,
  limit: number
): Promise<RecentActivity[]> {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: limit,
  });
  if (error || !data.users?.length) return [];
  return data.users.map((u) => ({
    id: `user-${u.id}`,
    type: "user" as const,
    title: u.email ?? "New user",
    description: "Signed up",
    timestamp: u.created_at ?? new Date().toISOString(),
  }));
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createAdminClient();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();

    const [totalUsers, moviesResult, moviesThisMonthResult, moviesLastMonthResult] =
      await Promise.all([
        getTotalUsers(supabase),
        supabase.from("movies").select("*", { count: "exact", head: true }),
        supabase
          .from("movies")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thisMonthStart),
        supabase
          .from("movies")
          .select("*", { count: "exact", head: true })
          .gte("created_at", twoMonthsAgo)
          .lt("created_at", lastMonthStart),
      ]);

    const totalMovies = moviesResult.count ?? 0;
    const moviesThisMonth = moviesThisMonthResult.count ?? 0;
    const moviesLastMonth = moviesLastMonthResult.count ?? 0;
    const moviesGrowth =
      moviesLastMonth > 0
        ? Math.round(((moviesThisMonth - moviesLastMonth) / moviesLastMonth) * 100)
        : moviesThisMonth > 0
          ? 100
          : 0;

    let totalRevenue = 0;
    let revenueGrowth = 0;
    let activeSubscriptions = 0;
    let chartData: RevenueChartData = { labels: [], datasets: [] };
    let paymentActivities: RecentActivity[] = [];

    const { data: paymentsData } = await supabase
      .from("payments")
      .select("amount, payment_status, created_at")
      .eq("payment_status", "completed");

    if (paymentsData?.length) {
      totalRevenue = paymentsData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const thisMonthRevenue = paymentsData
        .filter((p) => (p.created_at ?? "") >= thisMonthStart)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const lastMonthRevenue = paymentsData
        .filter(
          (p) =>
            (p.created_at ?? "") >= twoMonthsAgo && (p.created_at ?? "") < lastMonthStart
        )
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      revenueGrowth =
        lastMonthRevenue > 0
          ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
          : thisMonthRevenue > 0
            ? 100
            : 0;

      const months: { label: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          start: d.toISOString(),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
        });
      }
      const revenueByMonth = months.map((m) =>
        paymentsData
          .filter(
            (p) =>
              (p.created_at ?? "") >= m.start && (p.created_at ?? "") <= m.end
          )
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      );
      chartData = {
        labels: months.map((m) => m.label),
        datasets: [
          { label: "Revenue", data: revenueByMonth, color: "bg-emerald-500" },
        ],
      };

      paymentActivities = paymentsData
        .slice(0, 5)
        .map((p, i) => ({
          id: `payment-${i}-${p.created_at}`,
          type: "payment" as const,
          title: `$${Number(p.amount).toFixed(2)}`,
          description: "Payment completed",
          timestamp: p.created_at ?? new Date().toISOString(),
        }));
    }

    const { count: subsCount } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    if (subsCount != null) activeSubscriptions = subsCount;

    const { data: recentMovies } = await supabase
      .from("movies")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const movieActivities: RecentActivity[] = (recentMovies ?? []).map((m) => ({
      id: `movie-${m.id}`,
      type: "movie" as const,
      title: (m.title as string) ?? "Movie",
      description: "Added or updated",
      timestamp: (m.created_at as string) ?? new Date().toISOString(),
    }));

    const userActivities = await getUsersForActivity(supabase, 5);

    const activities: RecentActivity[] = [
      ...movieActivities,
      ...userActivities,
      ...paymentActivities,
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    const stats: DashboardStats = {
      ...EMPTY_STATS,
      totalUsers,
      totalMovies,
      totalRevenue,
      activeSubscriptions,
      usersGrowth: 0,
      moviesGrowth,
      revenueGrowth,
    };

    return NextResponse.json({
      stats,
      activities,
      chartData,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
