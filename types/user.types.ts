export type UserRole = "admin" | "user" | "moderator";

export type SubscriptionType = "free" | "premium" | "lifetime";

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "none";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  subscription_type: SubscriptionType;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
  /** Present when loaded from Supabase Auth (banned_until in the future). */
  blocked?: boolean;
}

/** Completed payments attributed to a movie for a single user. */
export interface UserPurchaseMovie {
  movieId: string;
  title: string;
  purchasedAt: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeSubscriptions: number;
  newUsersThisMonth: number;
}
