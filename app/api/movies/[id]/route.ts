import { NextResponse } from "next/server";
import type { Movie } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

function mapSupabaseRow(row: Record<string, unknown>): Movie {
  return {
    id: String(row.id),
    title: String(row.title),
    description: (row.description as string) ?? null,
    genre: (row.genre as string) ?? null,
    release_date: row.release_date ? String(row.release_date).slice(0, 10) : null,
    duration: row.duration != null ? Number(row.duration) : null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    video_url: (row.video_url as string) ?? null,
    subtitle_url: (row.subtitle_url as string) ?? null,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    return NextResponse.json({ movie: mapSupabaseRow(data) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
}
