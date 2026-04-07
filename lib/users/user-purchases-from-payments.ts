import { extractMovieIdFromPaymentRow, isPaymentCompleted } from "@/lib/sales/movie-sales-from-payments";
import type { UserPurchaseMovie } from "@/types";

/**
 * Deduped movies from completed payments for one user (same attribution rules as sales).
 */
export function purchasesFromCompletedPayments(
  paymentRows: Record<string, unknown>[],
  movies: { id: string; title: string | null }[]
): UserPurchaseMovie[] {
  const movieIdSet = new Set(movies.map((m) => String(m.id)));
  const titleLowerToId = new Map<string, string>();
  for (const m of movies) {
    const t = String(m.title ?? "").trim().toLowerCase();
    if (t && !titleLowerToId.has(t)) titleLowerToId.set(t, String(m.id));
  }

  const byMovie = new Map<string, string>();
  for (const row of paymentRows) {
    if (!isPaymentCompleted(row)) continue;
    const mid = extractMovieIdFromPaymentRow(row, movieIdSet, titleLowerToId);
    if (!mid) continue;
    const at = String(row.created_at ?? "");
    const prev = byMovie.get(mid);
    if (!prev || at > prev) byMovie.set(mid, at);
  }

  const titleById = new Map(movies.map((m) => [String(m.id), String(m.title ?? "Untitled")]));
  return [...byMovie.entries()]
    .map(([movieId, purchasedAt]) => ({
      movieId,
      title: titleById.get(movieId) ?? "Unknown title",
      purchasedAt,
    }))
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
}
