import { NextResponse } from "next/server";
import type { Movie } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";

function mapSupabaseRow(row: Record<string, unknown>): Movie {
  return {
    id: String(row.id),
    title: String(row.title),
    title_kh: (row.title_kh as string) ?? null,
    description: (row.description as string) ?? null,
    genre: (row.genre as string) ?? null,
    release_date: row.release_date ? String(row.release_date).slice(0, 10) : null,
    duration: row.duration != null ? Number(row.duration) : null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    video_url: (row.video_url as string) ?? null,
    status: (row.status as Movie["status"]) ?? "draft",
    type: (row.type as Movie["type"]) ?? "single",
    price: row.price != null ? Number(row.price) : null,
    free_episodes_count: row.free_episodes_count != null ? Number(row.free_episodes_count) : null,
    subscription_plan_id: (row.subscription_plan_id as string) ?? null,
    total_episodes: row.total_episodes != null ? Number(row.total_episodes) : null,
    cast: (row.cast as string) ?? null,
    trailer_url: (row.trailer_url as string) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search")?.toLowerCase();

    const supabase = createAdminClient();
    let query = supabase.from("movies").select("*").order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);
    if (search) query = query.or(`title.ilike.%${search}%,genre.ilike.%${search}%`);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
    }
    const movies = (data ?? []).map(mapSupabaseRow);
    return NextResponse.json({ movies });
  } catch {
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
