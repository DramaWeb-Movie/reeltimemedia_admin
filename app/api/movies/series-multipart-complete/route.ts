import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2/multipart-presigned";
import { getR2Config } from "@/lib/r2/client";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:series-multipart-complete");

export const runtime = "nodejs";

function buildPublicUrl(key: string): string {
  const { publicUrl } = getR2Config();
  return publicUrl ? `${publicUrl.replace(/\/$/, "")}/${key}` : key;
}

interface CompletedEpisode {
  episodeNumber: number;
  uploadId: string;
  key: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
  title: string;
  duration: number | null;
  isFreePreview: boolean;
}

/**
 * POST /api/movies/series-multipart-complete
 * Finalizes all episode multipart uploads, inserts episode rows, and
 * promotes the series to the user's chosen status.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { movieId, thumbnailKey, finalStatus = "draft", episodes } = body as {
      movieId: string;
      thumbnailKey: string;
      finalStatus?: string;
      episodes: CompletedEpisode[];
    };

    if (!movieId || !thumbnailKey || !Array.isArray(episodes) || episodes.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!["draft", "published"].includes(finalStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const expectedPrefix = `movies/${movieId}/`;
    if (!thumbnailKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid thumbnail key" }, { status: 400 });
    }
    for (const ep of episodes) {
      if (!ep.key.startsWith(expectedPrefix)) {
        return NextResponse.json(
          { error: `Invalid key for episode ${ep.episodeNumber}` },
          { status: 400 }
        );
      }
    }

    // Complete all episode multipart uploads in R2
    await Promise.all(
      episodes.map((ep) => completeMultipartUpload(ep.key, ep.uploadId, ep.parts))
    );

    // Construct URLs server-side
    const thumbnailUrl = buildPublicUrl(thumbnailKey);

    const supabase = createAdminClient();

    // Insert episode records
    const episodeRows = episodes.map((ep) => ({
      movie_id: movieId,
      episode_number: ep.episodeNumber,
      title: ep.title || `Episode ${ep.episodeNumber}`,
      duration: ep.duration ?? null,
      video_url: buildPublicUrl(ep.key),
      is_free_preview: Boolean(ep.isFreePreview),
    }));

    const { error: epError } = await supabase.from("series_episodes").insert(episodeRows);
    if (epError) {
      log.error("Failed to insert episode records", epError);
      return NextResponse.json(
        { error: "Upload completed but failed to save episodes" },
        { status: 500 }
      );
    }

    // Promote series to final status and save thumbnail URL
    const { error: updateError } = await supabase
      .from("movies")
      .update({
        thumbnail_url: thumbnailUrl,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", movieId);

    if (updateError) {
      log.error("Failed to update series record", updateError);
      return NextResponse.json(
        { error: "Upload completed but failed to save series data" },
        { status: 500 }
      );
    }

    log.info("Series upload finalized", { movieId, episodes: episodes.length, status: finalStatus });

    return NextResponse.json({ success: true, movie: { id: movieId, thumbnail_url: thumbnailUrl } });
  } catch (err) {
    log.error("Series multipart complete error", err);
    const message = err instanceof Error ? err.message : "Failed to complete upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/movies/series-multipart-complete
 * Aborts all in-progress multipart uploads and deletes the orphaned series record.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { movieId, multiparts } = body as {
      movieId?: string;
      multiparts?: Array<{ uploadId: string; key: string }>;
    };

    if (Array.isArray(multiparts)) {
      await Promise.allSettled(
        multiparts.map(({ uploadId, key }) => abortMultipartUpload(key, uploadId))
      );
    }

    if (movieId) {
      const supabase = createAdminClient();
      try {
        await supabase
          .from("movies")
          .delete()
          .eq("id", movieId)
          .eq("status", "uploading");
      } catch { /* best-effort */ }
      log.info("Cleaned up orphaned series record", { movieId });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Series multipart abort error", err);
    return NextResponse.json({ error: "Failed to abort upload" }, { status: 500 });
  }
}
