import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";
import { notifyTelegramNewMovie } from "@/lib/notifications/telegram";
import { createLogger } from "@/lib/logger";
import { validateMovieId } from "@/lib/validations";

const log = createLogger("api:confirm-upload");

export const runtime = "nodejs";

/**
 * POST /api/movies/confirm-upload
 * Confirm upload completion and save file URLs to database
 * 
 * Body: {
 *   movieId: string;
 *   videoUrl: string;
 *   thumbnailUrl: string;
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    const { movieId, videoUrl, thumbnailUrl } = body;

    const idError = validateMovieId(movieId);
    if (idError) return NextResponse.json({ error: idError }, { status: 400 });

    if (!videoUrl || !thumbnailUrl) {
      return NextResponse.json(
        { error: "videoUrl and thumbnailUrl are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify movie exists
    const { data: existingMovie, error: fetchError } = await supabase
      .from("movies")
      .select("id, title, type, status")
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", movieId);

    if (updateError) {
      log.error("Failed to update movie URLs", updateError);
      return NextResponse.json(
        { error: "Failed to save file URLs" },
        { status: 500 }
      );
    }

    await notifyTelegramNewMovie({
      movieId,
      title: existingMovie.title as string | null,
      type: existingMovie.type as string | null,
      status: existingMovie.status as string | null,
    });

    return NextResponse.json({
      success: true,
      movie: {
        id: movieId,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
      },
    });
  } catch (err) {
    log.error("Confirm upload error", err);
    const message = err instanceof Error ? err.message : "Failed to confirm upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
