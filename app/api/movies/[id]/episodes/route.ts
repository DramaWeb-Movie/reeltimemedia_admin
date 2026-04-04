import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadEpisodeVideo } from "@/lib/r2/upload";
import { requireAuth } from "@/lib/auth/requireAuth";

export interface SeriesEpisode {
  id: string;
  movie_id: string;
  episode_number: number;
  title: string;
  duration: number | null;
  video_url: string | null;
  encoding_status?: "pending" | "processing" | "ready" | "failed" | null;
  encoding_error?: string | null;
  hls_manifest_url?: string | null;
  is_free_preview: boolean;
  created_at: string;
}

function mapRow(row: Record<string, unknown>): SeriesEpisode {
  return {
    id: String(row.id),
    movie_id: String(row.movie_id),
    episode_number: Number(row.episode_number),
    title: String(row.title ?? ""),
    duration: row.duration != null ? Number(row.duration) : null,
    video_url: (row.video_url as string) ?? null,
    encoding_status: (row.encoding_status as SeriesEpisode["encoding_status"]) ?? null,
    encoding_error: (row.encoding_error as string) ?? null,
    hls_manifest_url: (row.hls_manifest_url as string) ?? null,
    is_free_preview: Boolean(row.is_free_preview),
    created_at: String(row.created_at ?? ""),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: movieId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("series_episodes")
      .select("*")
      .eq("movie_id", movieId)
      .order("episode_number", { ascending: true });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("42P01")) {
        console.warn("series_episodes table missing. Run the migration in lib/database/init-movies.sql:", msg);
        return NextResponse.json({ episodes: [] });
      }
      console.error("Episodes fetch error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to fetch episodes" },
        { status: 500 }
      );
    }

    const episodes = (data ?? []).map(mapRow);
    return NextResponse.json({ episodes });
  } catch (err) {
    console.error("Episodes API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch episodes" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: movieId } = await params;
    const formData = await request.formData();
    const title = (formData.get("title") as string)?.trim() || `Episode`;
    const duration = formData.get("duration") ? Number(formData.get("duration")) : null;
    const is_free_preview = formData.get("is_free_preview") === "true";
    const videoFile = formData.get("video") as File | null;

    if (!videoFile || videoFile.size === 0) {
      return NextResponse.json(
        { error: "Video file is required for new episode" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("series_episodes")
      .select("episode_number")
      .eq("movie_id", movieId)
      .order("episode_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = existing?.episode_number != null ? Number(existing.episode_number) + 1 : 1;

    let videoUrl: string | null = null;
    try {
      videoUrl = await uploadEpisodeVideo(movieId, nextNumber, videoFile);
    } catch (uploadErr) {
      console.error("Episode video upload error:", uploadErr);
      return NextResponse.json(
        { error: uploadErr instanceof Error ? uploadErr.message : "Failed to upload video" },
        { status: 500 }
      );
    }

    const { data: episode, error: insertError } = await supabase
      .from("series_episodes")
      .insert({
        movie_id: movieId,
        episode_number: nextNumber,
        title,
        duration,
        video_url: videoUrl,
        is_free_preview,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message ?? "Failed to add episode" },
        { status: 500 }
      );
    }
    return NextResponse.json({ episode: mapRow(episode) });
  } catch (err) {
    console.error("Add episode error:", err);
    return NextResponse.json(
      { error: "Failed to add episode" },
      { status: 500 }
    );
  }
}
