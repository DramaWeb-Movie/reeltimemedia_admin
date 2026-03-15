"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Movie } from "@/types";

const statusBadge: Record<Movie["status"], "default" | "success" | "warning" | "neutral"> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};

interface SeriesEpisode {
  id: string;
  movie_id: string;
  episode_number: number;
  title: string;
  duration: number | null;
  video_url: string | null;
  is_free_preview: boolean;
  created_at: string;
}

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const listHref = movie ? (movie.type === "series" ? "/movies/series" : "/movies/single") : "/movies";

  async function handleConfirmDelete() {
    if (!movie) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/movies/${id}`, { method: "DELETE" });
      if (res.ok) {
        setShowDeleteConfirm(false);
        router.push(listHref);
        return;
      }
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete movie.");
    } catch {
      alert("Failed to delete movie.");
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    fetch(`/api/movies/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const m = data?.movie ?? null;
        setMovie(m);
        if (m?.type === "series") {
          return fetch(`/api/movies/${id}/episodes`)
            .then((r) => (r.ok ? r.json() : { episodes: [] }))
            .then((d) => setEpisodes(d.episodes ?? []))
            .catch(() => setEpisodes([]));
        }
        setEpisodes([]);
      })
      .catch(() => setMovie(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    setSelectedEpisodeIndex(0);
  }, [episodes.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-600 dark:text-slate-400">Movie not found.</p>
        <Link href="/movies" className="inline-block mt-4">
          <Button variant="secondary">Back to Movies</Button>
        </Link>
      </div>
    );
  }

  const isSeries = movie.type === "series";

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href={listHref} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          ← Back to list
        </Link>
      </nav>

      {/* Hero: Video or poster + title block */}
      <div className="space-y-6">
        {movie.video_url ? (
          <div className="rounded-2xl overflow-hidden bg-black shadow-xl ring-1 ring-slate-200/50 dark:ring-slate-700/50">
            <div className="aspect-video w-full">
              <video
                className="w-full h-full object-contain"
                src={movie.video_url}
                controls
                playsInline
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        ) : null}

        {/* Trailer (when trailer_url is set) */}
        {movie.trailer_url ? (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Trailer
            </h2>
            <div className="rounded-2xl overflow-hidden bg-black shadow-xl ring-1 ring-slate-200/50 dark:ring-slate-700/50">
              <div className="aspect-video w-full max-w-2xl">
                {movie.trailer_url.includes("youtube.com") || movie.trailer_url.includes("youtu.be") ? (
                  <iframe
                    title="Trailer"
                    className="w-full h-full"
                    src={
                      movie.trailer_url.includes("youtu.be/")
                        ? `https://www.youtube.com/embed/${movie.trailer_url.split("youtu.be/")[1]?.split("?")[0] ?? ""}`
                        : movie.trailer_url.replace("watch?v=", "embed/").split("&")[0]
                    }
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    className="w-full h-full object-contain"
                    src={movie.trailer_url}
                    controls
                    playsInline
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Poster */}
          <div className="sm:w-52 shrink-0">
            <div className="aspect-[2/3] rounded-2xl bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-lg ring-1 ring-slate-200/50 dark:ring-slate-700/50">
              {movie.thumbnail_url ? (
                <img src={movie.thumbnail_url} alt={movie.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Title + meta + actions */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant={isSeries ? "info" : "default"}>{isSeries ? "Series" : "Single Movie"}</Badge>
                <Badge variant={statusBadge[movie.status]}>{movie.status}</Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {movie.title}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600 dark:text-slate-400">
                {movie.genre && <span>{movie.genre}</span>}
                {movie.release_date && <span>{new Date(movie.release_date).toLocaleDateString()}</span>}
                {movie.duration != null && <span>{movie.duration} min</span>}
              </div>
            </div>

            {/* Pricing / Access */}
            <Card padding="sm" className="!rounded-xl">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {isSeries ? "Access" : "Pricing"}
              </p>
              {isSeries ? (
                <p className="text-slate-800 dark:text-slate-200">
                  {movie.free_episodes_count ?? 0} free preview · {movie.total_episodes ?? "—"} episodes · Any subscription
                </p>
              ) : (
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  ${movie.price?.toFixed(2) ?? "—"} <span className="text-sm font-normal text-slate-600 dark:text-slate-400">one-time</span>
                </p>
              )}
            </Card>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={`/movies/${id}/edit`}>
                <Button>Edit</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="!border-red-200 !text-red-600 hover:!bg-red-50 dark:!border-red-800 dark:!text-red-400 dark:hover:!bg-red-950/40"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes (series only) – one player + compact list */}
      {isSeries && episodes.length > 0 ? (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
            Episodes ({episodes.length})
          </h2>
          {(() => {
            const selected = episodes[selectedEpisodeIndex];
            const hasVideo = selected?.video_url;
            return (
              <>
                <div className="rounded-xl overflow-hidden bg-black shadow-lg ring-1 ring-slate-200/50 dark:ring-slate-700/50 aspect-video max-w-3xl mb-4">
                  {hasVideo && selected?.video_url ? (
                    <video
                      key={selected.video_url}
                      className="w-full h-full object-contain"
                      src={selected.video_url}
                      controls
                      playsInline
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                      <span className="text-sm">
                        {selected ? "No video for this episode" : "Select an episode"}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {selected
                    ? `Playing: Episode ${selected.episode_number}${selected.title ? ` — ${selected.title}` : ""}`
                    : "Click an episode below to play"}
                </p>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                      <tr>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400 w-20">#</th>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">Title</th>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400 w-20">Duration</th>
                        <th className="w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {episodes.map((ep, i) => (
                        <tr
                          key={ep.id}
                          onClick={() => setSelectedEpisodeIndex(i)}
                          className={`
                            cursor-pointer transition-colors
                            ${i === selectedEpisodeIndex
                              ? "bg-red-500/15 dark:bg-red-500/20"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}
                          `}
                        >
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {ep.episode_number}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                            {ep.title || `Episode ${ep.episode_number}`}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                            {ep.duration != null ? `${ep.duration} min` : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            {ep.is_free_preview && (
                              <Badge variant="success" className="text-xs">Free</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </Card>
      ) : null}

      {/* Description */}
      {movie.description ? (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            Description
          </h2>
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {movie.description}
          </p>
        </Card>
      ) : null}

      {/* Details grid */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
          Details
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Type</dt>
            <dd className="font-medium text-slate-900 dark:text-white mt-0.5">{movie.type}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Status</dt>
            <dd className="font-medium text-slate-900 dark:text-white mt-0.5">{movie.status}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Genre</dt>
            <dd className="font-medium text-slate-900 dark:text-white mt-0.5">{movie.genre ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Release date</dt>
            <dd className="font-medium text-slate-900 dark:text-white mt-0.5">
              {movie.release_date ? new Date(movie.release_date).toLocaleDateString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Duration</dt>
            <dd className="font-medium text-slate-900 dark:text-white mt-0.5">{movie.duration != null ? `${movie.duration} min` : "—"}</dd>
          </div>
          {movie.video_url ? (
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-slate-500 dark:text-slate-400">Video URL</dt>
              <dd className="font-medium text-slate-900 dark:text-white mt-0.5 break-all text-xs">{movie.video_url}</dd>
            </div>
          ) : null}
          {movie.trailer_url ? (
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-slate-500 dark:text-slate-400">Trailer URL</dt>
              <dd className="font-medium text-slate-900 dark:text-white mt-0.5 break-all text-xs">
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  {movie.trailer_url}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete movie?"
        description={`"${movie.title}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
