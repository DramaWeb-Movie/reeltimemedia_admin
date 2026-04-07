export interface NewMovieNotificationInput {
  movieId: string;
  title?: string | null;
  type?: "single" | "series" | string | null;
  status?: "draft" | "published" | string | null;
}

export function buildMovieUrl(baseUrl: string, movieId: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/$/, "");
  if (normalizedBase.includes("movie_id")) {
    return normalizedBase.replaceAll("movie_id", movieId);
  }
  return `${normalizedBase}/${movieId}`;
}
