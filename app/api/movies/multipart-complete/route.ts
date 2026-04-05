import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2/multipart-presigned";
import { getR2Config } from "@/lib/r2/client";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";
import { notifyTelegramNewMovie } from "@/lib/notifications/telegram";
import { validateMultipartComplete, validateKeyBelongsToMovie, validateFinalStatus, validateMovieId } from "@/lib/validations";
import { enqueueTranscodeJob } from "@/lib/upload/transcode";

const log = createLogger("api:multipart-complete");

export const runtime = "nodejs";

function buildPublicUrl(key: string): string {
  const { publicUrl } = getR2Config();
  return publicUrl ? `${publicUrl.replace(/\/$/, "")}/${key}` : key;
}

/**
 * POST /api/movies/multipart-complete
 * Complete a multipart upload after all parts are uploaded.
 *
 * videoUrl and thumbnailUrl are constructed server-side from the keys — the
 * client is never trusted to supply arbitrary URLs into the database.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    const {
      movieId,
      uploadId,
      key,          // video key, e.g. "movies/<id>/video.mp4"
      thumbnailKey, // thumbnail key, e.g. "movies/<id>/thumbnail.jpg"
      parts,
      finalStatus = "draft",
    } = body;

    const fieldsError = validateMultipartComplete({ movieId, uploadId, key, thumbnailKey, parts });
    if (fieldsError) return NextResponse.json({ error: fieldsError }, { status: 400 });

    const statusError = validateFinalStatus(finalStatus);
    if (statusError) return NextResponse.json({ error: statusError }, { status: 400 });

    // Validate keys belong to this movie so clients can't forge arbitrary paths
    const videoKeyError = validateKeyBelongsToMovie(key, movieId);
    if (videoKeyError) return NextResponse.json({ error: "Invalid video key" }, { status: 400 });

    const thumbKeyError = validateKeyBelongsToMovie(thumbnailKey, movieId);
    if (thumbKeyError) return NextResponse.json({ error: "Invalid thumbnail key" }, { status: 400 });

    // Complete the multipart upload in R2
    await completeMultipartUpload(key, uploadId, parts);

    // Construct URLs server-side — never from client input
    const videoUrl = buildPublicUrl(key);
    const thumbnailUrl = buildPublicUrl(thumbnailKey);

    // Update movie record: set real URLs and promote to the user's chosen status
    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from("movies")
      .update({
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", movieId);

    if (updateError) {
      log.error("Failed to update movie record after upload", updateError);
      return NextResponse.json(
        { error: "Upload completed but failed to save movie data" },
        { status: 500 }
      );
    }

    const { data: movieRow } = await supabase
      .from("movies")
      .select("title, type, status")
      .eq("id", movieId)
      .single();

    try {
      await enqueueTranscodeJob({
        kind: "single_movie",
        movieId,
        sourceKey: key,
        outputKeyPrefix: `movies/${movieId}/hls`,
      });
    } catch (enqueueErr) {
      log.warn("Transcode enqueue failed after upload finalize", { movieId, error: enqueueErr });
    }

    await notifyTelegramNewMovie({
      movieId,
      title: movieRow?.title ?? null,
      type: movieRow?.type ?? "single",
      status: movieRow?.status ?? finalStatus,
    });

    log.info("Upload finalized", { movieId, status: finalStatus });

    return NextResponse.json({
      success: true,
      movie: { id: movieId, video_url: videoUrl, thumbnail_url: thumbnailUrl },
    });
  } catch (err) {
    log.error("Multipart complete error", err);
    const message = err instanceof Error ? err.message : "Failed to complete upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/movies/multipart-complete
 * Abort a multipart upload and delete the orphaned movie record.
 * Called automatically by the client on any upload failure or cancellation.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { uploadId, key, movieId } = body;

    if (!uploadId || !key || !movieId) {
      return NextResponse.json(
        { error: "movieId, uploadId and key are required" },
        { status: 400 }
      );
    }

    const idError = validateMovieId(movieId);
    if (idError) return NextResponse.json({ error: idError }, { status: 400 });

    const keyError = validateKeyBelongsToMovie(key, movieId);
    if (keyError) return NextResponse.json({ error: "Invalid key" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: movie, error: movieError } = await supabase
      .from("movies")
      .select("id, status")
      .eq("id", movieId)
      .single();

    if (movieError || !movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    if (movie.status !== "uploading") {
      return NextResponse.json(
        { error: "Cleanup is only allowed for uploads in uploading status" },
        { status: 409 }
      );
    }

    // Abort the in-progress multipart upload to avoid R2 storage charges
    await abortMultipartUpload(key, uploadId);

    // Delete the orphaned "uploading" movie record
    const { error } = await supabase
      .from("movies")
      .delete()
      .eq("id", movieId)
      .eq("status", "uploading"); // safety guard: only delete if still in uploading state

    if (error) {
      log.warn("Failed to delete orphaned movie record", { movieId, error });
    } else {
      log.info("Cleaned up orphaned movie record", { movieId });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Multipart abort error", err);
    return NextResponse.json({ error: "Failed to abort upload" }, { status: 500 });
  }
}
