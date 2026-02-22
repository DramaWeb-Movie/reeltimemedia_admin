import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@/types";

const PAGE_SIZE = 10;

function mapAuthUserToUser(row: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}): User {
  const metadata = row.user_metadata ?? {};
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
  };
}

export async function GET(request: Request) {
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

    const users = (data.users ?? []).map(mapAuthUserToUser);
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
