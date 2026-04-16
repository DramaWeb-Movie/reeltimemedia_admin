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

/** Completed payments attributed to a movie (see dashboard stats aggregation). */
export interface TopSaleMovie {
  movieId: string;
  title: string;
  salesCount: number;
}

export interface MovieSalesListResponse {
  items: TopSaleMovie[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  /** Inclusive bounds used for the query (ISO 8601, UTC), null when not filtered. */
  rangeStart: string | null;
  rangeEnd: string | null;
}
