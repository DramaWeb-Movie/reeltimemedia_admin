import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";
import { mapSupabaseAuthUserToAppUser, type SupabaseAuthUserLike } from "@/lib/users/map-auth-user";

const PAGE_SIZE = 10;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10)));

    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("Users fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const users = (data.users ?? []).map((u) => mapSupabaseAuthUserToAppUser(u as SupabaseAuthUserLike));
    const paginationData = data as { nextPage?: number | null };
    const hasMore = paginationData.nextPage != null || users.length >= perPage;

    return NextResponse.json({
      users,
      pagination: { page, perPage, hasMore },
    });
  } catch (err) {
    console.error("Users API error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
