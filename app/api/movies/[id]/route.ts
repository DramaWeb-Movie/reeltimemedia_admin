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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const supabase = createAdminClient();

    const allowed: Record<string, string> = {
      title: "title",
      title_kh: "title_kh",
      description: "description",
      genre: "genre",
      release_date: "release_date",
      duration: "duration",
      status: "status",
      price: "price",
      trailer_url: "trailer_url",
      cast: "cast",
      free_episodes_count: "free_episodes_count",
      total_episodes: "total_episodes",
      subscription_plan_id: "subscription_plan_id",
      thumbnail_url: "thumbnail_url",
      video_url: "video_url",
    };
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, col] of Object.entries(allowed)) {
      if (key in body) {
        const v = body[key];
        if (key === "duration" || key === "free_episodes_count" || key === "total_episodes") {
          updates[col] = v === "" || v === null ? null : Number(v);
        } else if (key === "price") {
          updates[col] = v === "" || v === null ? null : Number(v);
        } else {
          updates[col] = v === "" ? null : v;
        }
      }
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("movies")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to update movie" },
        { status: 500 }
      );
    }
    return NextResponse.json({ movie: mapSupabaseRow(data) });
  } catch {
    return NextResponse.json({ error: "Failed to update movie" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from("movies").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to delete movie" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete movie" }, { status: 500 });
  }
}
