import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadVideo, uploadThumbnail, uploadSubtitle } from "@/lib/r2/upload";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || null;
    const genre = (formData.get("genre") as string) || null;
    const cast = (formData.get("cast") as string) || null;
    const price = formData.get("price") ? Number(formData.get("price")) : null;
    const releaseDate = (formData.get("releaseDate") as string) || null;
    const duration = formData.get("duration") ? Number(formData.get("duration")) : null;
    const status = (formData.get("status") as "draft" | "published") || "draft";
    const trailerUrl = (formData.get("trailerUrl") as string) || null;

    const videoFile = formData.get("video") as File | null;
    const thumbnailFile = formData.get("thumbnail") as File | null;
    const subtitleFile = formData.get("subtitle") as File | null;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (!videoFile || !thumbnailFile) {
      return NextResponse.json(
        { error: "Video and thumbnail are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: movie, error: insertError } = await supabase
      .from("movies")
      .insert({
        title: title.trim(),
        description,
        genre,
        cast,
        release_date: releaseDate || null,
        duration,
        status,
        type: "single",
        price,
        trailer_url: trailerUrl,
        thumbnail_url: null,
        video_url: null,
        subtitle_url: null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message ?? "Failed to create movie record. Ensure the movies table exists in Supabase." },
        { status: 500 }
      );
    }

    const movieId = movie.id;

    const [videoUrl, thumbnailUrl, subtitleUrl] = await Promise.all([
      uploadVideo(movieId, videoFile),
      uploadThumbnail(movieId, thumbnailFile),
      subtitleFile?.size
        ? uploadSubtitle(movieId, subtitleFile)
        : Promise.resolve(null),
    ]);

    const { error: updateError } = await supabase
      .from("movies")
      .update({
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        subtitle_url: subtitleUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", movieId);

    if (updateError) {
      console.error("Failed to update movie URLs:", updateError);
      return NextResponse.json(
        { error: "Files uploaded but failed to save URLs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      movie: { id: movieId, video_url: videoUrl, thumbnail_url: thumbnailUrl, subtitle_url: subtitleUrl },
    });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
