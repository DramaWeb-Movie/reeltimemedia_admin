import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";

export const runtime = "nodejs";

/**
 * POST /api/movies/confirm-upload
 * Confirm upload completion and save file URLs to database
 * 
 * Body: {
 *   movieId: string;
 *   videoUrl: string;
 *   thumbnailUrl: string;
 *   subtitleUrl?: string;
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    const { movieId, videoUrl, thumbnailUrl, subtitleUrl } = body;

    if (!movieId || !videoUrl || !thumbnailUrl) {
      return NextResponse.json(
        { error: "movieId, videoUrl, and thumbnailUrl are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify movie exists
    const { data: existingMovie, error: fetchError } = await supabase
      .from("movies")
      .select("id")
      .eq("id", movieId)
      .single();

    if (fetchError || !existingMovie) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    // Update movie with file URLs
    const { error: updateError } = await supabase
      .from("movies")
      .update({
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        subtitle_url: subtitleUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", movieId);

    if (updateError) {
      console.error("Failed to update movie URLs:", updateError);
      return NextResponse.json(
        { error: "Failed to save file URLs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      movie: {
        id: movieId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        subtitle_url: subtitleUrl || null,
      },
    });
  } catch (err) {
    console.error("Confirm upload error:", err);
    const message = err instanceof Error ? err.message : "Failed to confirm upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
