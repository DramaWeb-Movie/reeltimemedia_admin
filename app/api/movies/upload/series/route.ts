import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadArtworkImage, uploadEpisodeVideo } from "@/lib/r2/upload";
import { requireAuth } from "@/lib/auth/requireAuth";
import { notifyNewMovieChannels } from "@/lib/notifications/new-movie-channels";
import { createLogger } from "@/lib/logger";
import { validateTitle, validateFilePresent } from "@/lib/validations";

const log = createLogger("api:upload:series");

// Route segment config to allow large file uploads (up to 5GB per episode)
export const runtime = "nodejs";
export const maxDuration = 300; // 5 min max on Hobby plan; series uploads should complete within this

interface EpisodeMeta {
  episodeNumber: number;
  title: string;
  duration: string;
  isFreePreview?: boolean;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();

    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string) || null;
    const genre = (formData.get("genre") as string) || null;
    const cast = (formData.get("cast") as string) || null;
    const releaseDate = (formData.get("releaseDate") as string) || null;
    const duration = formData.get("duration") ? Number(formData.get("duration")) : null;
    const status = (formData.get("status") as "draft" | "published") || "draft";
    const freeEpisodesCount = formData.get("freeEpisodesCount") != null ? Number(formData.get("freeEpisodesCount")) : null;
    const totalEpisodes = formData.get("totalEpisodes") != null ? Number(formData.get("totalEpisodes")) : null;
    const subscriptionPlanId = (formData.get("subscriptionPlanId") as string) || null;
    const trailerUrlRaw = (formData.get("trailerUrl") as string) || "";
    const trailerUrl = trailerUrlRaw.trim() || null;
    const thumbnailPhoneFile = formData.get("thumbnailPhone") as File | null;
    const thumbnailLaptopFile = formData.get("thumbnailLaptop") as File | null;
    const coverPhoneFile = formData.get("coverPhone") as File | null;
    const coverLaptopFile = formData.get("coverLaptop") as File | null;

    const episodesJson = formData.get("episodes") as string | null;
    let episodesMeta: EpisodeMeta[] = [];
    if (episodesJson) {
      try {
        episodesMeta = JSON.parse(episodesJson) as EpisodeMeta[];
      } catch {
        episodesMeta = [];
      }
    }

    const titleError = validateTitle(title);
    if (titleError) return NextResponse.json({ error: titleError }, { status: 400 });

    const artErr =
      validateFilePresent(thumbnailPhoneFile, "Thumbnail (phone)") ??
      validateFilePresent(thumbnailLaptopFile, "Thumbnail (laptop)") ??
      validateFilePresent(coverPhoneFile, "Movie cover (phone)") ??
      validateFilePresent(coverLaptopFile, "Movie cover (laptop)");
    if (artErr) return NextResponse.json({ error: artErr }, { status: 400 });

    if (episodesMeta.length === 0) {
      return NextResponse.json({ error: "At least one episode is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: movie, error: insertError } = await supabase
      .from("movies")
      .insert({
        title,
        description: description || null,
        genre: genre || null,
        cast: cast || null,
        release_date: releaseDate || null,
        duration,
        status,
        type: "series",
        price: null,
        free_episodes_count: freeEpisodesCount,
        total_episodes: totalEpisodes,
        subscription_plan_id: subscriptionPlanId || null,
        thumbnail_url: null,
        cover_url: null,
        video_url: null,
        trailer_url: trailerUrl,
      })
      .select("id")
      .single();

    if (insertError) {
      log.error("Series insert error", insertError);
      return NextResponse.json(
        {
          error:
            insertError.message ??
            "Failed to create series. Ensure the movies table exists in Supabase.",
        },
        { status: 500 }
      );
    }

    const movieId = movie.id;

    let thumbnailPhoneUrl: string;
    let thumbnailLaptopUrl: string;
    let coverPhoneUrl: string;
    let coverLaptopUrl: string;
    try {
      [thumbnailPhoneUrl, thumbnailLaptopUrl, coverPhoneUrl, coverLaptopUrl] = await Promise.all([
        uploadArtworkImage(movieId, title, thumbnailPhoneFile!, "thumbnail-phone"),
        uploadArtworkImage(movieId, title, thumbnailLaptopFile!, "thumbnail-laptop"),
        uploadArtworkImage(movieId, title, coverPhoneFile!, "cover-phone"),
        uploadArtworkImage(movieId, title, coverLaptopFile!, "cover-laptop"),
      ]);
    } catch (uploadErr) {
      log.error("Image upload error", uploadErr);
      return NextResponse.json(
        { error: uploadErr instanceof Error ? uploadErr.message : "Failed to upload images" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("movies")
      .update({
        thumbnail_url: thumbnailLaptopUrl,
        cover_url: coverPhoneUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", movieId);

    if (updateError) {
      log.error("Failed to save image URLs", updateError);
      return NextResponse.json(
        { error: "Series created but image URLs could not be saved" },
        { status: 500 }
      );
    }

    for (let i = 0; i < episodesMeta.length; i++) {
      const meta = episodesMeta[i];
      const epNum = meta.episodeNumber ?? i + 1;
      const videoFile = formData.get(`episode_${i}`) as File | null;
      let videoUrl: string | null = null;
      if (videoFile && videoFile.size > 0) {
        try {
          videoUrl = await uploadEpisodeVideo(movieId, title, epNum, videoFile);
        } catch (uploadErr) {
          log.error(`Episode ${epNum} upload error`, uploadErr);
          return NextResponse.json(
            {
              error:
                uploadErr instanceof Error
                  ? uploadErr.message
                  : `Failed to upload episode ${epNum} video`,
            },
            { status: 500 }
          );
        }
      }
      const { error: epError } = await supabase.from("series_episodes").insert({
        movie_id: movieId,
        episode_number: epNum,
        title: meta.title ?? `Episode ${epNum}`,
        duration: meta.duration ? parseInt(meta.duration, 10) || null : null,
        video_url: videoUrl,
        is_free_preview: Boolean(meta.isFreePreview),
      });
      if (epError) {
        log.error("Episode insert error", epError);
        return NextResponse.json(
          { error: epError.message ?? "Failed to save episode" },
          { status: 500 }
        );
      }
    }

    await notifyNewMovieChannels({
      movieId,
      title,
      type: "series",
      status,
    });

    return NextResponse.json({
      success: true,
      movie: {
        id: movieId,
        thumbnail_url: thumbnailLaptopUrl,
        cover_url: coverPhoneUrl,
      },
    });
  } catch (err) {
    log.error("Series upload error", err);
    const message = err instanceof Error ? err.message : "Failed to create series";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
