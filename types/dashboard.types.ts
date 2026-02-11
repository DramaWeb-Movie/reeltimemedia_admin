export interface DashboardStats {
  totalUsers: number;
  totalMovies: number;
  totalRevenue: number;
  activeSubscriptions: number;
  usersGrowth: number;
  moviesGrowth: number;
  revenueGrowth: number;
}

export interface RecentActivity {
  id: string;
  type: "user" | "payment" | "movie";
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface RevenueChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}
