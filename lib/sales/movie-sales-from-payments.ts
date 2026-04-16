import type { TopSaleMovie } from "@/types";

/** Match /api/payments/stats and mapPaymentRow: some rows use `status` instead of `payment_status`. */
export function effectivePaymentStatus(row: {
  payment_status?: unknown;
  status?: unknown;
}): string {
  return String(row.payment_status ?? row.status ?? "");
}

export function isPaymentCompleted(row: Record<string, unknown>): boolean {
  return effectivePaymentStatus(row) === "completed";
}

const UUID_IN_TEXT =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function parsePaymentMetadata(row: Record<string, unknown>): Record<string, unknown> | null {
  const m = row.metadata;
  if (m && typeof m === "object" && !Array.isArray(m)) return m as Record<string, unknown>;
  if (typeof m === "string") {
    try {
      const parsed = JSON.parse(m) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function extractMovieIdFromPaymentRow(
  row: Record<string, unknown>,
  movieIdSet: Set<string>,
  titleLowerToId: Map<string, string>
): string | null {
  const resolveCandidate = (value: unknown): string | null => {
    if (typeof value !== "string" || value.length === 0) return null;
    if (movieIdSet.has(value)) return value;
    const byTitle = titleLowerToId.get(value.trim().toLowerCase());
    return byTitle ?? null;
  };

  const directKeys = ["movie_id", "content_id", "product_id"] as const;
  for (const key of directKeys) {
    const resolved = resolveCandidate(row[key]);
    if (resolved) return resolved;
  }
  const meta = parsePaymentMetadata(row);
  if (meta) {
    const resolved = resolveCandidate(meta.movie_id ?? meta.movieId ?? meta.content_id);
    if (resolved) return resolved;
  }
  const desc = String(row.description ?? "").trim();
  if (!desc) return null;
  const uuidMatch = desc.match(UUID_IN_TEXT);
  if (uuidMatch && movieIdSet.has(uuidMatch[0])) return uuidMatch[0];
  const byTitle = titleLowerToId.get(desc.toLowerCase());
  if (byTitle) return byTitle;
  return null;
}

/**
 * Rank movies by number of completed payments (attribution rules: movie_id, metadata, description).
 * Sorted by sales count descending; not paginated.
 */
export function rankMoviesBySalesCount(
  completedPayments: Record<string, unknown>[],
  movies: { id: string; title: string | null }[]
): TopSaleMovie[] {
  const movieIdSet = new Set(movies.map((m) => String(m.id)));
  const titleLowerToId = new Map<string, string>();
  for (const m of movies) {
    const t = String(m.title ?? "").trim().toLowerCase();
    if (t && !titleLowerToId.has(t)) titleLowerToId.set(t, String(m.id));
  }
  const counts = new Map<string, number>();
  for (const row of completedPayments) {
    const mid = extractMovieIdFromPaymentRow(row, movieIdSet, titleLowerToId);
    if (!mid) continue;
    counts.set(mid, (counts.get(mid) ?? 0) + 1);
  }
  const titleById = new Map(movies.map((m) => [String(m.id), String(m.title ?? "Untitled")]));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([movieId, salesCount]) => ({
      movieId,
      title: titleById.get(movieId) ?? "Unknown title",
      salesCount,
    }));
}
