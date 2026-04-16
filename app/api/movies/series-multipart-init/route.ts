import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  initEpisodeVideoMultipartUpload,
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

const log = createLogger("api:series-multipart-init");

export const runtime = "nodejs";

interface EpisodeInput {
  episodeNumber: number;
  title: string;
  duration: number | null;
  isFreePreview: boolean;
  videoType: string;
  videoSize: number;
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
    releaseDate,
    duration,
    trailerUrl,
    isPromotionHero = false,
    finalStatus = "draft",
    thumbnailPhoneType,
    thumbnailPhoneSize,
    thumbnailLaptopType,
    thumbnailLaptopSize,
    coverPhoneType,
    coverPhoneSize,
    coverLaptopType,
    coverLaptopSize,
    freeEpisodesCount,
    totalEpisodes,
    episodes,
  }: {
    title: string;
    title_kh?: string | null;
    description?: string;
    genre?: string;
    cast?: string;
    releaseDate?: string;
    duration?: number | null;
    trailerUrl?: string | null;
    finalStatus?: string;
    thumbnailPhoneType: string;
    thumbnailPhoneSize?: number;
    thumbnailLaptopType: string;
    thumbnailLaptopSize?: number;
    coverPhoneType: string;
    coverPhoneSize?: number;
    coverLaptopType: string;
    coverLaptopSize?: number;
    freeEpisodesCount?: number;
    totalEpisodes?: number;
    episodes: EpisodeInput[];
  } = body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  for (const [label, t] of [
    ["Thumbnail (phone)", thumbnailPhoneType],
    ["Thumbnail (laptop)", thumbnailLaptopType],
    ["Cover (phone)", coverPhoneType],
    ["Cover (laptop)", coverLaptopType],
  ] as const) {
    if (!t || !ALLOWED_IMAGE_TYPES.includes(t)) {
      return NextResponse.json(
        { error: `${label}: invalid type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
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
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return NextResponse.json({ error: "At least one episode is required" }, { status: 400 });
  }
  if (!["draft", "published"].includes(finalStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  for (const ep of episodes) {
    if (!ALLOWED_VIDEO_TYPES.includes(ep.videoType)) {
      return NextResponse.json(
        { error: `Episode ${ep.episodeNumber}: invalid video type` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(Number(ep.videoSize)) || Number(ep.videoSize) <= 0) {
      return NextResponse.json(
        { error: `Episode ${ep.episodeNumber}: video size must be greater than 0` },
        { status: 400 }
      );
    }
    if (Number(ep.videoSize) > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: `Episode ${ep.episodeNumber}: video too large (max ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB)` },
        { status: 400 }
      );
    }
  }

  const supabase = createAdminClient();

  // Create series record with status "uploading" — never visible until complete
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
      type: "series",
      price: null,
      free_episodes_count: freeEpisodesCount ?? null,
      total_episodes: totalEpisodes ?? episodes.length,
      subscription_plan_id: null,
      thumbnail_url: null,
      cover_url: null,
      video_url: null,
      trailer_url:
        typeof trailerUrl === "string" && trailerUrl.trim() ? trailerUrl.trim() : null,
      is_promotion_hero: Boolean(isPromotionHero),
    })
    .select("id")
    .single();

  if (insertError) {
    log.error("Series insert error", insertError);
    return NextResponse.json(
      { error: insertError.message ?? "Failed to create series record" },
      { status: 500 }
    );
  }

  const movieId = movie.id;
  const seriesTitle = title.trim();

  // Track created multipart uploads so we can abort them all on failure
  const createdMultiparts: Array<{ uploadId: string; key: string }> = [];

  try {
    const base = movieStorageDir(seriesTitle, movieId);
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

    // One multipart upload per episode
    const episodeUploads = await Promise.all(
      episodes.map(async (ep) => {
        const multipart = await initEpisodeVideoMultipartUpload(
          movieId,
          seriesTitle,
          ep.episodeNumber,
          ep.videoType,
          Number(ep.videoSize)
        );
        createdMultiparts.push({
          uploadId: multipart.upload.uploadId,
          key: multipart.upload.key,
        });
        return {
          episodeNumber: ep.episodeNumber,
          uploadId: multipart.upload.uploadId,
          key: multipart.upload.key,
          partUrls: multipart.partUrls,
          partSize: multipart.partSize,
          totalParts: multipart.totalParts,
        };
      })
    );

    log.info("Series multipart upload initialized", { movieId, episodes: episodes.length });

    return NextResponse.json({
      success: true,
      movieId,
      finalStatus,
      thumbnailPhone: { uploadUrl: thumbnailPhone.uploadUrl, key: thumbnailPhone.key },
      thumbnailLaptop: { uploadUrl: thumbnailLaptop.uploadUrl, key: thumbnailLaptop.key },
      coverPhone: { uploadUrl: coverPhone.uploadUrl, key: coverPhone.key },
      coverLaptop: { uploadUrl: coverLaptop.uploadUrl, key: coverLaptop.key },
      episodes: episodeUploads,
    });
  } catch (err) {
    log.error("Failed to initialize series upload, cleaning up", { movieId });
    try {
      await supabase.from("movies").delete().eq("id", movieId);
    } catch { /* best-effort */ }
    for (const { uploadId, key } of createdMultiparts) {
      await abortMultipartUpload(key, uploadId).catch(() => {});
    }
    const message = err instanceof Error ? err.message : "Failed to initialize upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
