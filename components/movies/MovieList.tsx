"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Movie, MovieStatus } from "@/types";

interface MovieListProps {
  movies: Movie[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  variant?: "single" | "series";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(mins: number | null): string {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const STATUS_STYLES: Record<MovieStatus | "uploading", string> = {
  published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25",
  draft:     "bg-slate-500/10  text-slate-500  dark:text-slate-400  ring-1 ring-slate-500/20",
  archived:  "bg-amber-500/15  text-amber-600  dark:text-amber-400  ring-1 ring-amber-500/25",
  uploading: "bg-blue-500/15   text-blue-600   dark:text-blue-400   ring-1 ring-blue-500/25",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status as MovieStatus] ?? STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

// ── Confirmation modal ─────────────────────────────────────────────────────────

interface DeleteModalProps {
  movie: Movie;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ movie, isDeleting, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Copy */}
        <div className="text-center space-y-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delete movie?</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">{movie.title}</span> will be
            permanently deleted. This cannot be undone.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? <Spinner size="sm" /> : <TrashIcon />}
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MovieList({ movies, isLoading, onDelete, variant = "single" }: MovieListProps) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<Movie | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/movies/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete movie");
      }
      toastSuccess(`"${pendingDelete.title}" deleted`);
      onDelete?.(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to delete movie");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
        <svg className="w-10 h-10 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-slate-600 dark:text-slate-300 font-medium">
          {variant === "series" ? "No series found" : "No movies found"}
        </p>
        <p className="text-sm text-slate-400 mt-1">
          {variant === "series"
            ? "Try adjusting your filters or upload a new series."
            : "Try adjusting your filters or upload a new movie."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[240px]">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[180px]">
                  Khmer Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Genre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {variant === "series" ? "Episodes" : "Price"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Released
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {movies.map((movie) => (
                <tr
                  key={movie.id}
                  onClick={() => router.push(`/movies/${movie.id}`)}
                  className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  {/* Title + thumbnail */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-9 h-12 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {movie.thumbnail_url ? (
                          <img
                            src={movie.thumbnail_url}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-[180px] group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                        {movie.title}
                      </span>
                    </div>
                  </td>

                  {/* Khmer title */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                    {movie.title_kh ?? "—"}
                  </td>

                  {/* Genre */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {movie.genre ?? "—"}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={movie.status} />
                  </td>

                  {/* Price / Episodes */}
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                    {variant === "series"
                      ? movie.total_episodes != null
                        ? `${movie.total_episodes} ep${movie.total_episodes !== 1 ? "s" : ""}`
                        : "—"
                      : movie.price != null
                        ? `$${movie.price.toFixed(2)}`
                        : "—"}
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                    {formatDuration(movie.duration)}
                  </td>

                  {/* Release date */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(movie.release_date)}
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(movie.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => router.push(`/movies/${movie.id}/edit`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(movie)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row count footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {movies.length} {variant === "series"
              ? movies.length === 1 ? "series" : "series"
              : movies.length === 1 ? "movie" : "movies"}
          </p>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <DeleteModal
          movie={pendingDelete}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !isDeleting && setPendingDelete(null)}
        />
      )}
    </>
  );
}
