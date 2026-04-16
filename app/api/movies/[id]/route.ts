import { NextResponse } from "next/server";
import type { Movie } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";
import { deleteR2Objects, listR2ObjectKeysByPrefix } from "@/lib/r2/delete";
import {
  hlsOutputPrefixFromSourceVideoKey,
  isR2KeyForMovie,
  objectKeyFromStoredFileUrl,
} from "@/lib/r2/storage-path";

function mapSupabaseRow(row: Record<string, unknown>): Movie {
  return {
    id: String(row.id),
    title: String(row.title),
    title_kh: (row.title_kh as string) ?? null,
    description: (row.description as string) ?? null,
    genre: (row.genre as string) ?? null,
    release_date: row.release_date ? String(row.release_date).slice(0, 10) : null,
    duration: row.duration != null ? Number(row.duration) : null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    cover_url: (row.cover_url as string) ?? null,
    promotion_banner_url: (row.promotion_banner_url as string) ?? null,
    video_url: (row.video_url as string) ?? null,
    status: (row.status as Movie["status"]) ?? "draft",
    type: (row.type as Movie["type"]) ?? "single",
    price: row.price != null ? Number(row.price) : null,
    free_episodes_count: row.free_episodes_count != null ? Number(row.free_episodes_count) : null,
    subscription_plan_id: (row.subscription_plan_id as string) ?? null,
    total_episodes: row.total_episodes != null ? Number(row.total_episodes) : null,
    cast: (row.cast as string) ?? null,
    trailer_url: (row.trailer_url as string) ?? null,
    encoding_status: (row.encoding_status as Movie["encoding_status"]) ?? null,
    encoding_error: (row.encoding_error as string) ?? null,
    hls_manifest_url: (row.hls_manifest_url as string) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

type EpisodeMediaRow = {
  video_url: string | null;
  hls_manifest_url: string | null;
};

function collectMovieOwnedObjectKeys(
  movieId: string,
  publicUrl: string,
  urls: Array<string | null | undefined>
): string[] {
  return urls
    .map((url) => (url ? objectKeyFromStoredFileUrl(url, publicUrl) : null))
    .filter((key): key is string => Boolean(key))
    .filter((key) => isR2KeyForMovie(key, movieId));
}

async function collectMovieRelatedR2Keys(
  movieId: string,
  publicUrl: string,
  movie: Pick<
    Movie,
    | "video_url"
    | "thumbnail_url"
    | "cover_url"
    | "promotion_banner_url"
    | "hls_manifest_url"
  >,
  episodes: EpisodeMediaRow[]
): Promise<string[]> {
  const directKeys = collectMovieOwnedObjectKeys(movieId, publicUrl, [
    movie.video_url,
    movie.thumbnail_url,
    movie.cover_url,
    movie.promotion_banner_url,
    movie.hls_manifest_url,
    ...episodes.flatMap((ep) => [ep.video_url, ep.hls_manifest_url]),
  ]);

  const hlsPrefixes = directKeys
    .filter((key) => key.endsWith(".m3u8") || key.includes("/hls/"))
    .map((key) => {
      if (key.endsWith(".m3u8")) {
        const hlsIndex = key.indexOf("/hls/");
        if (hlsIndex !== -1) {
          return key.slice(0, hlsIndex + "/hls".length);
        }
      }
      const hlsIndex = key.indexOf("/hls/");
      return hlsIndex === -1 ? key : key.slice(0, hlsIndex + "/hls".length);
    });

  if (movie.video_url) {
    const sourceVideoKey = objectKeyFromStoredFileUrl(movie.video_url, publicUrl);
    if (sourceVideoKey && isR2KeyForMovie(sourceVideoKey, movieId)) {
      hlsPrefixes.push(hlsOutputPrefixFromSourceVideoKey(sourceVideoKey));
    }
  }

  for (const ep of episodes) {
    if (!ep.video_url) continue;
    const epVideoKey = objectKeyFromStoredFileUrl(ep.video_url, publicUrl);
    if (epVideoKey && isR2KeyForMovie(epVideoKey, movieId)) {
      hlsPrefixes.push(hlsOutputPrefixFromSourceVideoKey(epVideoKey));
    }
  }

  const prefixMatches = await Promise.all(
    Array.from(new Set(hlsPrefixes))
      .filter((prefix) => isR2KeyForMovie(prefix, movieId))
      .map((prefix) => listR2ObjectKeysByPrefix(prefix))
  );

  return Array.from(new Set([...directKeys, ...prefixMatches.flat()])).filter((key) =>
    isR2KeyForMovie(key, movieId)
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    return NextResponse.json({ movie: mapSupabaseRow(data) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch movie" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const supabase = createAdminClient();

    const allowed: Record<string, string> = {
      title: "title",
      title_kh: "title_kh",
      description: "description",
      genre: "genre",
      release_date: "release_date",
      duration: "duration",
      status: "status",
      price: "price",
      trailer_url: "trailer_url",
      cast: "cast",
      free_episodes_count: "free_episodes_count",
      total_episodes: "total_episodes",
      subscription_plan_id: "subscription_plan_id",
      thumbnail_url: "thumbnail_url",
      cover_url: "cover_url",
      promotion_banner_url: "promotion_banner_url",
      video_url: "video_url",
    };
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, col] of Object.entries(allowed)) {
      if (key in body) {
        const v = body[key];
        if (key === "duration" || key === "free_episodes_count" || key === "total_episodes") {
          updates[col] = v === "" || v === null ? null : Number(v);
        } else if (key === "price") {
          updates[col] = v === "" || v === null ? null : Number(v);
        } else {
          updates[col] = v === "" ? null : v;
        }
      }
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("movies")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to update movie" },
        { status: 500 }
      );
    }
    return NextResponse.json({ movie: mapSupabaseRow(data) });
  } catch {
    return NextResponse.json({ error: "Failed to update movie" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data: movieRow, error: movieError } = await supabase
      .from("movies")
      .select(
        "id, video_url, thumbnail_url, cover_url, promotion_banner_url, hls_manifest_url"
      )
      .eq("id", id)
      .single();

    if (movieError || !movieRow) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const { data: episodeRows } = await supabase
      .from("series_episodes")
      .select("video_url, hls_manifest_url")
      .eq("movie_id", id);

    const publicUrl = process.env.R2_PUBLIC_URL ?? "";
    let r2KeysToDelete: string[] = [];
    try {
      r2KeysToDelete = await collectMovieRelatedR2Keys(
        id,
        publicUrl,
        movieRow as Pick<
          Movie,
          | "video_url"
          | "thumbnail_url"
          | "cover_url"
          | "promotion_banner_url"
          | "hls_manifest_url"
        >,
        (episodeRows ?? []) as EpisodeMediaRow[]
      );
    } catch (err) {
      console.warn("Failed to prepare R2 keys for deletion", { movieId: id, err });
    }

    const { error } = await supabase.from("movies").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to delete movie" },
        { status: 500 }
      );
    }

    if (r2KeysToDelete.length > 0) {
      try {
        await deleteR2Objects(r2KeysToDelete);
      } catch (err) {
        console.warn("Movie deleted from DB, but failed to delete some R2 objects", {
          movieId: id,
          err,
          objectCount: r2KeysToDelete.length,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete movie" }, { status: 500 });
  }
}
