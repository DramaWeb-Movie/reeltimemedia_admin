import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadVideo, uploadThumbnail, uploadSubtitle } from "@/lib/r2/upload";
import { requireAuth } from "@/lib/auth/requireAuth";

// Route segment config to allow large file uploads (up to 5GB)
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes timeout for large uploads
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    // Validate Content-Type before parsing
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      console.error("Invalid Content-Type:", contentType);
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    console.log("Parsing FormData, Content-Type:", contentType);
    const formData = await request.formData();
    console.log("FormData parsed successfully");

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
    
    // Provide more specific error messages
    let message = "Upload failed";
    let status = 500;
    
    if (err instanceof Error) {
      if (err.message.includes("parse") && err.message.includes("FormData")) {
        message = "Failed to parse upload data. The file may be too large or the upload was interrupted.";
        status = 413;
      } else if (err.message.includes("Content-Type")) {
        message = err.message;
        status = 400;
      } else {
        message = err.message;
      }
    }
    
    return NextResponse.json({ error: message }, { status });
  }
}
