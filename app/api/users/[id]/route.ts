import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";
import { mapSupabaseAuthUserToAppUser, type SupabaseAuthUserLike } from "@/lib/users/map-auth-user";
import { purchasesFromCompletedPayments } from "@/lib/users/user-purchases-from-payments";
import type { UserPurchaseMovie } from "@/types";

const log = createLogger("api:users:detail");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(id);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const appUser = mapSupabaseAuthUserToAppUser(authData.user as SupabaseAuthUserLike);

    let purchases: UserPurchaseMovie[] = [];
    try {
      const [{ data: payRaw, error: payErr }, { data: moviesRaw, error: moviesErr }] = await Promise.all([
        supabase.from("payments").select("*").eq("user_id", id),
        supabase.from("movies").select("id, title"),
      ]);
      if (payErr) log.warn("Payments query failed for user", payErr);
      if (moviesErr) log.warn("Movies query failed for purchases", moviesErr);
      const rows = (payRaw ?? []) as Record<string, unknown>[];
      const movies = (moviesRaw ?? []) as { id: string; title: string | null }[];
      purchases = purchasesFromCompletedPayments(rows, movies);
    } catch (err) {
      log.warn("Purchase aggregation failed", err);
    }

    return NextResponse.json({ user: appUser, purchases });
  } catch (err) {
    log.error("User detail error", err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    if (auth.user.id === id) {
      return NextResponse.json(
        { error: "You cannot change ban status for your own account" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const blocked = (body as { blocked?: unknown }).blocked;
    if (typeof blocked !== "boolean") {
      return NextResponse.json({ error: "Body must include blocked: boolean" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: blocked ? "100y" : "none",
    });

    if (error) {
      log.error("updateUserById ban failed", error);
      return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
    }
    if (!data?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const appUser = mapSupabaseAuthUserToAppUser(data.user as SupabaseAuthUserLike);
    return NextResponse.json({ user: appUser });
  } catch (err) {
    log.error("User PATCH error", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
