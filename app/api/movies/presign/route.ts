import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMovieUploadUrls } from "@/lib/r2/presigned";
import { requireAuth } from "@/lib/auth/requireAuth";

export const runtime = "nodejs";

/**
 * POST /api/movies/presign
 * Generate presigned URLs for direct upload to R2
 * 
 * Body: {
 *   title: string;
 *   description?: string;
 *   genre?: string;
 *   cast?: string;
 *   price?: number;
 *   releaseDate?: string;
 *   duration?: number;
 *   status?: "draft" | "published";
 *   trailerUrl?: string;
 *   videoType: string; // MIME type e.g. "video/mp4"
 *   thumbnailType: string; // MIME type e.g. "image/jpeg"
 * }
 * 
 * Returns: {
 *   success: true;
 *   movieId: string;
 *   uploadUrls: {
 *     video: { uploadUrl: string; key: string; publicUrl: string };
 *     thumbnail: { uploadUrl: string; key: string; publicUrl: string };
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    const {
      title,
      description,
      genre,
      cast,
      price,
      releaseDate,
      duration,
      status = "draft",
      trailerUrl,
      videoType,
      thumbnailType,
    } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (!videoType || !thumbnailType) {
      return NextResponse.json(
        { error: "Video type and thumbnail type are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create the movie record first to get the ID
    const { data: movie, error: insertError } = await supabase
      .from("movies")
      .insert({
        title: title.trim(),
        description: description || null,
        genre: genre || null,
        cast: cast || null,
        release_date: releaseDate || null,
        duration: duration ? Number(duration) : null,
        status,
        type: "single",
        price: price ? Number(price) : null,
        trailer_url: trailerUrl || null,
        thumbnail_url: null,
        video_url: null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message ?? "Failed to create movie record" },
        { status: 500 }
      );
    }

    const movieId = movie.id;

    // Generate presigned URLs for upload
    const uploadUrls = await generateMovieUploadUrls(
      movieId,
      title.trim(),
      videoType,
      thumbnailType
    );

    return NextResponse.json({
      success: true,
      movieId,
      uploadUrls,
    });
  } catch (err) {
    console.error("Presign error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate upload URLs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
