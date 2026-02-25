import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Get the current Supabase user from request cookies.
 * Use in API route handlers. Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * Require authentication for admin API routes.
 * Call at the start of a route handler. Returns 401 JSON if not logged in.
 */
export async function requireAuth(): Promise<
  { user: User } | NextResponse
> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
}
