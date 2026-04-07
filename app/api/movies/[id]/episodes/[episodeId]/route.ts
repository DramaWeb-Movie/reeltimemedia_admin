import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadEpisodeVideo } from "@/lib/r2/upload";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getR2Config } from "@/lib/r2/client";
import {
  hlsOutputPrefixFromSourceVideoKey,
  objectKeyFromStoredFileUrl,
} from "@/lib/r2/storage-path";
import { enqueueTranscodeJob } from "@/lib/upload/transcode";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:episodes:patch");

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: movieId, episodeId } = await params;
    const supabase = createAdminClient();

    const contentType = request.headers.get("content-type") ?? "";
    let title: string | null = null;
    let duration: number | null = null;
    let is_free_preview: boolean | null = null;
    let videoFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const t = formData.get("title");
      title = t !== null && t !== undefined ? String(t) : null;
      const d = formData.get("duration");
      duration = d !== null && d !== undefined && d !== "" ? Number(d) : null;
      const f = formData.get("is_free_preview");
      if (f !== null && f !== undefined && f !== "") {
        const value = String(f).toLowerCase();
        is_free_preview = value === "true" || value === "1" || value === "on";
      } else {
        is_free_preview = null;
      }
      videoFile = formData.get("video") as File | null;
      if (videoFile?.size === 0) videoFile = null;
    } else {
      const body = await request.json().catch(() => ({}));
      title = body.title !== undefined ? String(body.title) : null;
      duration = body.duration !== undefined && body.duration !== "" ? Number(body.duration) : null;
      is_free_preview = body.is_free_preview !== undefined ? Boolean(body.is_free_preview) : null;
    }

    const { data: existing, error: fetchError } = await supabase
      .from("series_episodes")
      .select("id, episode_number, title, duration, is_free_preview, video_url")
      .eq("movie_id", movieId)
      .eq("id", episodeId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const { data: seriesRow } = await supabase
      .from("movies")
      .select("title")
      .eq("id", movieId)
      .single();
    const seriesTitle = String(seriesRow?.title ?? "");

    const updates: Record<string, unknown> = {};
    if (title !== null) updates.title = title;
    if (duration !== null) updates.duration = duration;
    if (is_free_preview !== null) updates.is_free_preview = is_free_preview;

    let replacedVideoKey: string | null = null;
    let replacedEpisodeNumber: number | null = null;

    if (videoFile && videoFile.size > 0) {
      const episodeNumber = Number(existing.episode_number);
      const videoUrl = await uploadEpisodeVideo(movieId, seriesTitle, episodeNumber, videoFile);
      updates.video_url = videoUrl;
      updates.hls_manifest_url = null;
      updates.encoding_status = "pending";
      updates.encoding_error = null;
      const { publicUrl } = getR2Config();
      replacedVideoKey = objectKeyFromStoredFileUrl(videoUrl, publicUrl);
      replacedEpisodeNumber = episodeNumber;
    }

    const { data: updated, error: updateError } = await supabase
      .from("series_episodes")
      .update(updates)
      .eq("id", episodeId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message ?? "Failed to update episode" },
        { status: 500 }
      );
    }

    if (videoFile && videoFile.size > 0) {
      if (replacedVideoKey && replacedEpisodeNumber != null) {
        try {
          await enqueueTranscodeJob({
            kind: "single_episode",
            movieId,
            episodeId,
            episodeNumber: replacedEpisodeNumber,
            sourceKey: replacedVideoKey,
            outputKeyPrefix: hlsOutputPrefixFromSourceVideoKey(replacedVideoKey),
          });
        } catch (enqueueErr) {
          log.warn("Transcode enqueue failed after episode video replace", {
            movieId,
            episodeId,
            error: enqueueErr,
          });
        }
      } else {
        log.warn("Episode video replaced but could not derive R2 key for transcode enqueue", {
          movieId,
          episodeId,
        });
      }
    }

    return NextResponse.json({ episode: updated });
  } catch (err) {
    console.error("Episode PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update episode" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { episodeId } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("series_episodes")
      .delete()
      .eq("id", episodeId);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to delete episode" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Episode DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete episode" },
      { status: 500 }
    );
  }
}
