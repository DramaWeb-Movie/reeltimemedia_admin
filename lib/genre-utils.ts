import { GENRES } from "@/lib/constants/genres";

const GENRE_SET = new Set<string>(GENRES);

const MAX_LABEL_LEN = 64;

/** Trim, collapse spaces, cap length; if it matches a built-in genre (any case), use canonical spelling. */
export function normalizeGenreLabel(input: string): string {
  const t = input.trim().replace(/\s+/g, " ").slice(0, MAX_LABEL_LEN);
  if (!t) return t;
  const found = GENRES.find((g) => g.toLowerCase() === t.toLowerCase());
  return found ?? t;
}

/**
 * Parse stored genre string (comma-separated) into unique ordered labels.
 * Includes both canonical GENRES and any custom labels typed by admins.
 */
export function parseGenresFromDb(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const g = normalizeGenreLabel(part);
    if (!g || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
  }
  return out;
}

/** True if this label is one of the built-in checklist genres. */
export function isCanonicalGenre(label: string): boolean {
  return GENRE_SET.has(label);
}

/** Persist selected + custom genres for the `movies.genre` column (comma-separated). */
export function serializeGenresToDb(selected: string[]): string | null {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const s of selected) {
    const g = normalizeGenreLabel(s);
    if (!g || seen.has(g)) continue;
    seen.add(g);
    unique.push(g);
  }
  return unique.length ? unique.join(", ") : null;
}

/** Display line for UI (e.g. detail header, tables). */
export function formatGenresDisplay(raw: string | null | undefined): string {
  const list = parseGenresFromDb(raw);
  return list.length ? list.join(" · ") : "";
}
