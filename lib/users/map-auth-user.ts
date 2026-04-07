import type { User as AppUser } from "@/types";

/** Subset of Supabase Auth user fields used by the admin API. */
export type SupabaseAuthUserLike = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  banned_until?: string | null;
};

export function mapSupabaseAuthUserToAppUser(row: SupabaseAuthUserLike): AppUser {
  const metadata = row.user_metadata ?? {};
  const bannedUntil = row.banned_until;
  const blocked =
    typeof bannedUntil === "string" &&
    bannedUntil.length > 0 &&
    new Date(bannedUntil).getTime() > Date.now();

  return {
    id: row.id,
    email: row.email ?? "",
    full_name: (metadata.full_name as string) ?? (metadata.name as string) ?? null,
    avatar_url: (metadata.avatar_url as string) ?? null,
    subscription_type: "free",
    subscription_status: "none",
    subscription_expires_at: null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    blocked,
  };
}
