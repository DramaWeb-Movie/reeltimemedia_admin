"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Movie, MovieStatus } from "@/types";
import { formatGenresDisplay } from "@/lib/genre-utils";
import { ChevronLeft, ChevronRight, Film, Pencil, Trash2, Video } from "lucide-react";

interface MovieListProps {
  movies: Movie[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  variant?: "single" | "series";
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
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

function getMovieListImage(movie: Movie): string | null {
  return movie.cover_url ?? movie.thumbnail_url;
}

type MovieDisplayStatus = MovieStatus | "uploading";
type PageItem = number | "ellipsis-left" | "ellipsis-right";

const STATUS_STYLES: Record<MovieDisplayStatus, string> = {
  published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25",
  draft:     "bg-slate-500/10  text-slate-500  dark:text-slate-400  ring-1 ring-slate-500/20",
  archived:  "bg-amber-500/15  text-amber-600  dark:text-amber-400  ring-1 ring-amber-500/25",
  uploading: "bg-blue-500/15   text-blue-600   dark:text-blue-400   ring-1 ring-blue-500/25",
};

type EncodingStatus = NonNullable<Movie["encoding_status"]>;

const ENCODING_STATUS_STYLES: Record<EncodingStatus, string> = {
  pending: "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20",
  processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
  ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25",
  failed: "bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/25",
};

function TranscodeStatusBadge({ status }: { status: Movie["encoding_status"] }) {
  if (!status) {
    return (
      <span className="text-slate-400 dark:text-slate-500 tabular-nums" title="No transcode job or not applicable">
        —
      </span>
    );
  }
  const style = ENCODING_STATUS_STYLES[status] ?? ENCODING_STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}

function StatusBadge({ status }: { status: MovieDisplayStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MovieList({
  movies,
  isLoading,
  onDelete,
  variant = "single",
  page,
  pageSize,
  total,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
}: MovieListProps) {
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
        <Film className="w-10 h-10 mx-auto text-slate-400 mb-3" />
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

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pageItems = buildPageItems(page, totalPages);

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-60">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-45">
                  Khmer Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Genres
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Transcode
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
              {movies.map((movie) => {
                const listRowImage = getMovieListImage(movie);
                return (
                <tr
                  key={movie.id}
                  onClick={() => router.push(`/movies/${movie.id}`)}
                  className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  {/* Title + thumbnail */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-9 h-12 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {listRowImage ? (
                          <Image
                            src={listRowImage}
                            alt={movie.title}
                            width={36}
                            height={48}
                            unoptimized
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Video className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-45 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                        {movie.title}
                      </span>
                    </div>
                  </td>

                  {/* Khmer title */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-45 truncate">
                    {movie.title_kh ?? "—"}
                  </td>

                  {/* Genres */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-52">
                    <span className="line-clamp-2 text-sm" title={formatGenresDisplay(movie.genre) || undefined}>
                      {formatGenresDisplay(movie.genre) || "—"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={movie.status} />
                  </td>

                  {/* Transcode / encoding */}
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    title={movie.encoding_error ?? undefined}
                  >
                    <TranscodeStatusBadge status={movie.encoding_status} />
                  </td>

                  {/* Price / Episodes */}
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                    {variant === "series"
                      ? movie.total_episodes != null
                        ? `${movie.total_episodes} ep${movie.total_episodes !== 1 ? "s" : ""}`
                        : "—"
                      : movie.price != null && movie.price > 0
                        ? `$${movie.price.toFixed(2)}`
                        : "Free"}
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
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(movie)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Row count footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing {start}-{end} of {total} {variant === "series" ? "series" : "movies"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={!hasPreviousPage}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>

              <div className="flex items-center gap-1">
                {pageItems.map((item, index) => {
                  if (typeof item !== "number") {
                    return (
                      <span
                        key={`${item}-${index}`}
                        className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500"
                      >
                        ...
                      </span>
                    );
                  }

                  const isActive = item === page;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onPageChange(item)}
                      className={`min-w-8 rounded-md px-2 py-1.5 text-xs border transition-colors ${
                        isActive
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={!hasNextPage}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <ConfirmDialog
          isOpen={Boolean(pendingDelete)}
          onClose={() => !isDeleting && setPendingDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete movie?"
          description={`\"${pendingDelete.title}\" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
