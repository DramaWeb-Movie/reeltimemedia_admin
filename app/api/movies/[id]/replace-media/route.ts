import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePresignedUploadUrl } from "@/lib/r2/presigned";
import {
  initMovieVideoMultipartUpload,
  completeMultipartUpload,
  abortMultipartUpload,
} from "@/lib/r2/multipart-presigned";
import { getR2Config } from "@/lib/r2/client";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  getExtension,
} from "@/lib/r2/mime";
import { movieStorageDir, isR2KeyForMovie, hlsOutputPrefixFromSourceVideoKey } from "@/lib/r2/storage-path";
import type { ArtworkRole } from "@/lib/constants/movie-artwork";
import { enqueueTranscodeJob } from "@/lib/upload/transcode";

const log = createLogger("api:replace-media");

export const runtime = "nodejs";

function buildPublicUrl(key: string): string {
  const { publicUrl } = getR2Config();
  return publicUrl ? `${publicUrl.replace(/\/$/, "")}/${key}` : key;
}

/**
 * POST /api/movies/[id]/replace-media
 * Generate presigned URLs for replacing artwork and/or video of an existing movie.
 * Body: optional image MIME + size for any of:
 *   thumbnailPhone*, thumbnailLaptop*, coverPhone*, coverLaptop* (matches upload keys),
 *   promotionBannerType*, promotionBannerSize*,
 *   or legacy thumbnailType / coverType (same as laptop thumbnail + phone cover).
 *   videoType?, videoSize?, videoPartSize?
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const {
    thumbnailType,
    thumbnailSize,
    coverType,
    coverSize,
    thumbnailPhoneType,
    thumbnailPhoneSize,
    thumbnailLaptopType,
    thumbnailLaptopSize,
    coverPhoneType,
    coverPhoneSize,
    coverLaptopType,
    coverLaptopSize,
    promotionBannerType,
    promotionBannerSize,
    videoType,
    videoSize,
    videoPartSize,
  } = body;

  const hasAnyImage =
    thumbnailType ||
    coverType ||
    thumbnailPhoneType ||
    thumbnailLaptopType ||
    coverPhoneType ||
    coverLaptopType ||
    promotionBannerType;

  if (!hasAnyImage && !videoType) {
    return NextResponse.json(
      { error: "At least one image role, promotion banner, legacy thumbnail/cover, or videoType is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: movie, error: fetchErr } = await supabase
    .from("movies")
    .select("id, type, title")
    .eq("id", id)
    .single();

  if (fetchErr || !movie) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }

  const movieTitle = String(movie.title ?? "");
  const base = movieStorageDir(movieTitle, id);

  const result: Record<string, unknown> = {};

  const presignArtwork = async (
    role: ArtworkRole,
    mime: string,
    size: unknown,
    label: string
  ): Promise<NextResponse | null> => {
    if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
      return NextResponse.json({ error: `Invalid ${label} type` }, { status: 400 });
    }
    if (size && Number(size) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `${label} too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }
    const ext = getExtension(mime, "jpg");
    const key = `${base}/${role}-${Date.now()}.${ext}`;
    const presigned = await generatePresignedUploadUrl(key, mime);
    const camel =
      role === "thumbnail-phone"
        ? "thumbnailPhone"
        : role === "thumbnail-laptop"
          ? "thumbnailLaptop"
          : role === "cover-phone"
            ? "coverPhone"
            : "coverLaptop";
    result[camel] = presigned;
    return null;
  };

  try {
    for (const [mime, size, role, label] of [
      [thumbnailPhoneType, thumbnailPhoneSize, "thumbnail-phone", "Thumbnail (phone)"] as const,
      [thumbnailLaptopType, thumbnailLaptopSize, "thumbnail-laptop", "Thumbnail (laptop)"] as const,
      [coverPhoneType, coverPhoneSize, "cover-phone", "Cover (phone)"] as const,
      [coverLaptopType, coverLaptopSize, "cover-laptop", "Cover (laptop)"] as const,
    ]) {
      if (!mime) continue;
      const err = await presignArtwork(role, mime, size, label);
      if (err) return err;
    }

    // Legacy names: same assets as laptop hero thumbnail + phone list cover
    if (thumbnailType && !thumbnailLaptopType) {
      const err = await presignArtwork("thumbnail-laptop", thumbnailType, thumbnailSize, "Thumbnail");
      if (err) return err;
      result.thumbnail = result.thumbnailLaptop;
    }

    if (coverType && !coverPhoneType) {
      const err = await presignArtwork("cover-phone", coverType, coverSize, "Cover image");
      if (err) return err;
      result.cover = result.coverPhone;
    }

    if (promotionBannerType) {
      if (!ALLOWED_IMAGE_TYPES.includes(promotionBannerType)) {
        return NextResponse.json({ error: "Invalid promotion banner type" }, { status: 400 });
      }
      if (promotionBannerSize && Number(promotionBannerSize) > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Promotion banner too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)` },
          { status: 400 }
        );
      }
      const ext = getExtension(promotionBannerType, "jpg");
      const key = `${base}/promotion-banner-${Date.now()}.${ext}`;
      result.promotionBanner = await generatePresignedUploadUrl(key, promotionBannerType);
    }

    if (videoType) {
      if (!ALLOWED_VIDEO_TYPES.includes(videoType)) {
        return NextResponse.json({ error: "Invalid video type" }, { status: 400 });
      }
      if (videoSize && Number(videoSize) > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `Video too large (max ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB)` },
          { status: 400 }
        );
      }
      const multipart = await initMovieVideoMultipartUpload(
        id,
        movieTitle,
        videoType,
        Number(videoSize),
        videoPartSize
      );
      result.video = {
        uploadId: multipart.upload.uploadId,
        key: multipart.upload.key,
        partUrls: multipart.partUrls,
        partSize: multipart.partSize,
        totalParts: multipart.totalParts,
        publicUrl: multipart.upload.publicUrl,
      };
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    log.error("Failed to generate replacement presigned URLs", err);
    const message = err instanceof Error ? err.message : "Failed to prepare upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/movies/[id]/replace-media
 * Complete a video multipart upload and save the new video_url to the DB.
 * Body: { uploadId, key, parts }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const { uploadId, key, parts } = body;

  if (!uploadId || !key || !parts?.length) {
    return NextResponse.json(
      { error: "uploadId, key, and parts are required" },
      { status: 400 }
    );
  }

  if (!isR2KeyForMovie(key, id)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    await completeMultipartUpload(key, uploadId, parts);

    const videoUrl = buildPublicUrl(key);

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("movies")
      .update({
        video_url: videoUrl,
        hls_manifest_url: null,
        encoding_status: "pending",
        encoding_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      log.error("Failed to update video_url", error);
      return NextResponse.json({ error: "Failed to save video URL" }, { status: 500 });
    }

    try {
      await enqueueTranscodeJob({
        kind: "single_movie",
        movieId: id,
        sourceKey: key,
        outputKeyPrefix: hlsOutputPrefixFromSourceVideoKey(key),
      });
    } catch (enqueueErr) {
      log.warn("Transcode enqueue failed after video replace", { movieId: id, error: enqueueErr });
    }

    log.info("Video replaced", { movieId: id });
    return NextResponse.json({ success: true, video_url: videoUrl });
  } catch (err) {
    log.error("Failed to complete video replacement", err);
    const message = err instanceof Error ? err.message : "Failed to complete upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/movies/[id]/replace-media
 * Abort an in-progress video multipart upload.
 * Body: { uploadId, key }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const { uploadId, key } = body;

  if (!uploadId || !key) {
    return NextResponse.json({ error: "uploadId and key are required" }, { status: 400 });
  }

  if (!isR2KeyForMovie(key, id)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  await abortMultipartUpload(key, uploadId).catch(() => {});
  return NextResponse.json({ success: true });
}
