import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2/multipart-presigned";
import { getR2Config } from "@/lib/r2/client";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";

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
      subtitleKey,  // optional, e.g. "movies/<id>/subtitles/en.vtt"
      parts,
      finalStatus = "draft",
    } = body;

    if (!movieId || !uploadId || !key || !thumbnailKey || !parts?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["draft", "published"].includes(finalStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Validate keys belong to this movie so clients can't forge arbitrary paths
    const expectedPrefix = `movies/${movieId}/`;
    if (!key.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid video key" }, { status: 400 });
    }
    if (!thumbnailKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid thumbnail key" }, { status: 400 });
    }
    if (subtitleKey && !subtitleKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid subtitle key" }, { status: 400 });
    }

    // Complete the multipart upload in R2
    await completeMultipartUpload(key, uploadId, parts);

    // Construct all URLs server-side — never from client input
    const videoUrl = buildPublicUrl(key);
    const thumbnailUrl = buildPublicUrl(thumbnailKey);
    const subtitleUrl = subtitleKey ? buildPublicUrl(subtitleKey) : null;

    // Update movie record: set real URLs and promote to the user's chosen status
    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from("movies")
      .update({
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        subtitle_url: subtitleUrl,
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

    log.info("Upload finalized", { movieId, status: finalStatus });

    return NextResponse.json({
      success: true,
      movie: { id: movieId, video_url: videoUrl, thumbnail_url: thumbnailUrl, subtitle_url: subtitleUrl },
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

    if (!uploadId || !key) {
      return NextResponse.json(
        { error: "uploadId and key are required" },
        { status: 400 }
      );
    }

    // Abort the in-progress multipart upload to avoid R2 storage charges
    await abortMultipartUpload(key, uploadId);

    // Delete the orphaned "uploading" movie record
    if (movieId) {
      const supabase = createAdminClient();
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
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Multipart abort error", err);
    return NextResponse.json({ error: "Failed to abort upload" }, { status: 500 });
  }
}
