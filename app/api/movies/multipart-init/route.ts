import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  initMovieVideoMultipartUpload,
  abortMultipartUpload,
} from "@/lib/r2/multipart-presigned";
import { generatePresignedUploadUrl } from "@/lib/r2/presigned";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";
import {
  getExtension,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_VIDEO_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/r2/mime";
import { movieStorageDir } from "@/lib/r2/storage-path";

const log = createLogger("api:multipart-init");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();

  const {
    title,
    title_kh,
    description,
    genre,
    cast,
    price,
    releaseDate,
    duration,
    // finalStatus is what the user wants — kept out of the DB until upload is confirmed
    finalStatus = "draft",
    trailerUrl,
    videoType,
    videoSize,
    thumbnailType,
    thumbnailSize,
    subtitleFileName,
    partSize,
  } = body;

  // ── Validation ───────────────────────────────────────────────────────────────
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!videoType || !videoSize || !thumbnailType) {
    return NextResponse.json(
      { error: "videoType, videoSize, and thumbnailType are required" },
      { status: 400 }
    );
  }
  if (!ALLOWED_VIDEO_TYPES.includes(videoType)) {
    return NextResponse.json(
      { error: `Invalid video type. Allowed: ${ALLOWED_VIDEO_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!ALLOWED_IMAGE_TYPES.includes(thumbnailType)) {
    return NextResponse.json(
      { error: `Invalid thumbnail type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (Number(videoSize) > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `Video too large. Maximum is ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB` },
      { status: 400 }
    );
  }
  if (thumbnailSize && Number(thumbnailSize) > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Thumbnail too large. Maximum is ${MAX_IMAGE_BYTES / 1024 / 1024}MB` },
      { status: 400 }
    );
  }
  if (!["draft", "published"].includes(finalStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Create the movie record with status "uploading" so it is never visible
  // to end-users during the upload process. The complete route promotes it
  // to the user's chosen finalStatus once all files are safely in R2.
  const { data: movie, error: insertError } = await supabase
    .from("movies")
    .insert({
      title: title.trim(),
      title_kh: title_kh || null,
      description: description || null,
      genre: genre || null,
      cast: cast || null,
      release_date: releaseDate || null,
      duration: duration ? Number(duration) : null,
      status: "uploading",
      type: "single",
      price: price ? Number(price) : null,
      trailer_url: trailerUrl || null,
      thumbnail_url: null,
      video_url: null,
    })
    .select("id")
    .single();

  if (insertError) {
    log.error("Supabase insert error", insertError);
    return NextResponse.json(
      { error: insertError.message ?? "Failed to create movie record" },
      { status: 500 }
    );
  }

  const movieId = movie.id;
  const movieTitle = title.trim();

  // Track multipart state so we can abort on error
  let multipartUploadId: string | null = null;
  let multipartKey: string | null = null;

  try {
    const multipart = await initMovieVideoMultipartUpload(
      movieId,
      movieTitle,
      videoType,
      Number(videoSize),
      partSize
    );
    multipartUploadId = multipart.upload.uploadId;
    multipartKey = multipart.upload.key;

    const thumbnailExt = getExtension(thumbnailType, "jpg");
    const base = movieStorageDir(movieTitle, movieId);
    const thumbnailKey = `${base}/thumbnail.${thumbnailExt}`;
    const thumbnail = await generatePresignedUploadUrl(thumbnailKey, thumbnailType);

    let subtitle = null;
    if (subtitleFileName) {
      const subtitleExt = subtitleFileName.toLowerCase().endsWith(".srt") ? "srt" : "vtt";
      const subtitleKey = `${base}/subtitles/en.${subtitleExt}`;
      const contentType = subtitleExt === "vtt" ? "text/vtt" : "application/x-subrip";
      subtitle = await generatePresignedUploadUrl(subtitleKey, contentType);
    }

    log.info("Multipart upload initialized", {
      movieId,
      chunks: multipart.totalParts,
      partSizeBytes: multipart.partSize,
    });

    return NextResponse.json({
      success: true,
      movieId,
      finalStatus,
      video: {
        uploadId: multipart.upload.uploadId,
        key: multipart.upload.key,
        partUrls: multipart.partUrls,
        partSize: multipart.partSize,
        totalParts: multipart.totalParts,
      },
      thumbnail: {
        uploadUrl: thumbnail.uploadUrl,
        key: thumbnail.key,
      },
      subtitle: subtitle
        ? { uploadUrl: subtitle.uploadUrl, key: subtitle.key }
        : null,
    });
  } catch (err) {
    log.error("Failed to initialize upload, cleaning up orphaned resources", { movieId });
    // Delete the orphaned movie row
    try {
      await supabase.from("movies").delete().eq("id", movieId);
    } catch { /* best-effort */ }
    // Abort the multipart upload in R2 if it was created
    if (multipartUploadId && multipartKey) {
      await abortMultipartUpload(multipartKey, multipartUploadId).catch(() => {});
    }
    const message = err instanceof Error ? err.message : "Failed to initialize upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
