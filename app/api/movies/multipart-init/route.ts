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

function assertImageType(label: string, mime: string): NextResponse | null {
  if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
    return NextResponse.json(
      { error: `${label}: invalid type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  return null;
}

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
    finalStatus = "draft",
    trailerUrl,
    isPromotionHero = false,
    videoType,
    videoSize,
    thumbnailPhoneType,
    thumbnailPhoneSize,
    thumbnailLaptopType,
    thumbnailLaptopSize,
    coverPhoneType,
    coverPhoneSize,
    coverLaptopType,
    coverLaptopSize,
    subtitleFileName,
    partSize,
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (
    !videoType ||
    !videoSize ||
    !thumbnailPhoneType ||
    !thumbnailLaptopType ||
    !coverPhoneType ||
    !coverLaptopType
  ) {
    return NextResponse.json(
      { error: "videoType, videoSize, and all four artwork image types are required" },
      { status: 400 }
    );
  }
  if (!ALLOWED_VIDEO_TYPES.includes(videoType)) {
    return NextResponse.json(
      { error: `Invalid video type. Allowed: ${ALLOWED_VIDEO_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  for (const [label, t] of [
    ["Thumbnail (phone)", thumbnailPhoneType],
    ["Thumbnail (laptop)", thumbnailLaptopType],
    ["Cover (phone)", coverPhoneType],
    ["Cover (laptop)", coverLaptopType],
  ] as const) {
    const err = assertImageType(label, t);
    if (err) return err;
  }
  if (Number(videoSize) > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `Video too large. Maximum is ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB` },
      { status: 400 }
    );
  }
  for (const [label, sz] of [
    ["Thumbnail (phone)", thumbnailPhoneSize],
    ["Thumbnail (laptop)", thumbnailLaptopSize],
    ["Cover (phone)", coverPhoneSize],
    ["Cover (laptop)", coverLaptopSize],
  ] as const) {
    if (sz && Number(sz) > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `${label} too large. Maximum is ${MAX_IMAGE_BYTES / 1024 / 1024}MB` },
        { status: 400 }
      );
    }
  }
  if (!["draft", "published"].includes(finalStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();

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
      is_promotion_hero: Boolean(isPromotionHero),
      thumbnail_url: null,
      cover_url: null,
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

    const base = movieStorageDir(movieTitle, movieId);
    const tpExt = getExtension(thumbnailPhoneType, "jpg");
    const tlExt = getExtension(thumbnailLaptopType, "jpg");
    const cpExt = getExtension(coverPhoneType, "jpg");
    const clExt = getExtension(coverLaptopType, "jpg");

    const [thumbnailPhone, thumbnailLaptop, coverPhone, coverLaptop] = await Promise.all([
      generatePresignedUploadUrl(`${base}/thumbnail-phone.${tpExt}`, thumbnailPhoneType),
      generatePresignedUploadUrl(`${base}/thumbnail-laptop.${tlExt}`, thumbnailLaptopType),
      generatePresignedUploadUrl(`${base}/cover-phone.${cpExt}`, coverPhoneType),
      generatePresignedUploadUrl(`${base}/cover-laptop.${clExt}`, coverLaptopType),
    ]);

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

    const slot = (p: { uploadUrl: string; key: string }) => ({
      uploadUrl: p.uploadUrl,
      key: p.key,
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
      thumbnailPhone: slot(thumbnailPhone),
      thumbnailLaptop: slot(thumbnailLaptop),
      coverPhone: slot(coverPhone),
      coverLaptop: slot(coverLaptop),
      subtitle: subtitle
        ? { uploadUrl: subtitle.uploadUrl, key: subtitle.key }
        : null,
    });
  } catch (err) {
    log.error("Failed to initialize upload, cleaning up orphaned resources", { movieId });
    try {
      await supabase.from("movies").delete().eq("id", movieId);
    } catch { /* best-effort */ }
    if (multipartUploadId && multipartKey) {
      await abortMultipartUpload(multipartKey, multipartUploadId).catch(() => {});
    }
    const message = err instanceof Error ? err.message : "Failed to initialize upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
