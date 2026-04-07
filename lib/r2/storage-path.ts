/**
 * R2 object key layout under movies/.
 *
 * New uploads use: movies/{slug}_{movieId}/... so the console shows a readable title slug.
 * The full UUID remains in the folder name so keys stay unique and stable if the title changes.
 *
 * Legacy keys movies/{movieId}/... remain valid for existing objects.
 */

const MAX_SLUG_LEN = 80;

export function sanitizeMovieTitleForStorage(title: string): string {
  const t = String(title ?? "").trim().toLowerCase();
  const ascii = t.normalize("NFKD").replace(/\p{M}/gu, "");
  let slug = ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LEN);
  if (!slug) slug = "movie";
  return slug;
}

/** Prefix without trailing slash, e.g. movies/inception_020aec4a-... */
export function movieStorageDir(title: string | null | undefined, movieId: string): string {
  const slug = sanitizeMovieTitleForStorage(title ?? "");
  return `movies/${slug}_${movieId}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True if key is under this movie's folder (new slug_uuid layout or legacy uuid-only).
 */
export function isR2KeyForMovie(key: string, movieId: string): boolean {
  if (key.startsWith(`movies/${movieId}/`)) return true;
  const re = new RegExp(`^movies/[^/]+_${escapeRegExp(movieId)}/`);
  return re.test(key);
}

/** e.g. movies/foo_uuid/video.mp4 -> movies/foo_uuid/hls */
export function hlsOutputPrefixFromSourceVideoKey(videoKey: string): string {
  const dir = videoKey.slice(0, Math.max(0, videoKey.lastIndexOf("/")));
  return `${dir}/hls`;
}

/**
 * Recover the R2 object key from a public file URL built with R2_PUBLIC_URL,
 * or return the input when it is already a bare key (no scheme).
 */
export function objectKeyFromStoredFileUrl(
  fileUrl: string,
  publicBase: string | undefined
): string | null {
  if (!fileUrl?.trim()) return null;
  const trimmed = fileUrl.trim();
  if (!trimmed.includes("://")) return trimmed;
  const base = (publicBase ?? "").replace(/\/$/, "");
  if (!base) return null;
  if (trimmed.startsWith(`${base}/`)) return trimmed.slice(base.length + 1);
  return null;
}
