import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2/multipart-presigned";
import { getR2Config } from "@/lib/r2/client";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";
import { notifyNewMovieChannels } from "@/lib/notifications/new-movie-channels";
import { validateMultipartComplete, validateKeyBelongsToMovie, validateFinalStatus, validateMovieId } from "@/lib/validations";
import { enqueueTranscodeJob } from "@/lib/upload/transcode";
import { hlsOutputPrefixFromSourceVideoKey } from "@/lib/r2/storage-path";

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
 * Image URLs are constructed server-side from the keys — the client is never trusted
 * to supply arbitrary URLs into the database.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    const {
      movieId,
      uploadId,
      key,
      thumbnailPhoneKey,
      thumbnailLaptopKey,
      coverPhoneKey,
      coverLaptopKey,
      parts,
      finalStatus = "draft",
    } = body;

    const fieldsError = validateMultipartComplete({
      movieId,
      uploadId,
      key,
      thumbnailPhoneKey,
      thumbnailLaptopKey,
      coverPhoneKey,
      coverLaptopKey,
      parts,
    });
    if (fieldsError) return NextResponse.json({ error: fieldsError }, { status: 400 });

    const statusError = validateFinalStatus(finalStatus);
    if (statusError) return NextResponse.json({ error: statusError }, { status: 400 });

    const videoKeyError = validateKeyBelongsToMovie(key, movieId);
    if (videoKeyError) return NextResponse.json({ error: "Invalid video key" }, { status: 400 });

    for (const [label, imgKey] of [
      ["thumbnail phone", thumbnailPhoneKey],
      ["thumbnail laptop", thumbnailLaptopKey],
      ["cover phone", coverPhoneKey],
      ["cover laptop", coverLaptopKey],
    ] as const) {
      const e = validateKeyBelongsToMovie(imgKey, movieId);
      if (e) return NextResponse.json({ error: `Invalid ${label} key` }, { status: 400 });
    }

    await completeMultipartUpload(key, uploadId, parts);

    const thumbnailPhoneUrl = buildPublicUrl(thumbnailPhoneKey);
    const thumbnailLaptopUrl = buildPublicUrl(thumbnailLaptopKey);
    const coverPhoneUrl = buildPublicUrl(coverPhoneKey);
    const coverLaptopUrl = buildPublicUrl(coverLaptopKey);
    const videoUrl = buildPublicUrl(key);

    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from("movies")
      .update({
        video_url: videoUrl,
        thumbnail_url: thumbnailLaptopUrl,
        cover_url: coverPhoneUrl,
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
        outputKeyPrefix: hlsOutputPrefixFromSourceVideoKey(key),
      });
    } catch (enqueueErr) {
      log.warn("Transcode enqueue failed after upload finalize", { movieId, error: enqueueErr });
    }

    await notifyNewMovieChannels({
      movieId,
      title: movieRow?.title ?? null,
      type: movieRow?.type ?? "single",
      status: movieRow?.status ?? finalStatus,
    });

    log.info("Upload finalized", { movieId, status: finalStatus });

    return NextResponse.json({
      success: true,
      movie: {
        id: movieId,
        video_url: videoUrl,
        thumbnail_url: thumbnailLaptopUrl,
        cover_url: coverPhoneUrl,
      },
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

    await abortMultipartUpload(key, uploadId);

    const { error } = await supabase
      .from("movies")
      .delete()
      .eq("id", movieId)
      .eq("status", "uploading");

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
