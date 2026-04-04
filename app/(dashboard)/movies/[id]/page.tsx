"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HlsQualityPlayer } from "@/components/movies/HlsQualityPlayer";
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
  encoding_status?: "pending" | "processing" | "ready" | "failed" | null;
  encoding_error?: string | null;
  hls_manifest_url?: string | null;
  is_free_preview: boolean;
  created_at: string;
}

function renderEncodingStatus(status?: string | null): string {
  if (!status) return "not_started";
  return status;
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
        {movie.video_url || movie.hls_manifest_url ? (
          <div className="rounded-2xl overflow-hidden">
            <div className="w-full max-w-3xl mx-auto">
              <HlsQualityPlayer
                className="w-full aspect-video object-contain"
                manifestUrl={movie.hls_manifest_url}
                fallbackUrl={movie.video_url}
                poster={movie.thumbnail_url ?? undefined}
              />
            </div>
          </div>
        ) : null}

        {/* Trailer (when trailer_url is set) */}
        {movie.trailer_url ? (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Trailer
            </h2>
            <div className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/40 shadow-xl ring-1 ring-slate-200/50 dark:ring-slate-700/50">
              <div className="aspect-video w-full max-w-2xl mx-auto">
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
      {isSeries && episodes.length === 0 ? (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
            Episodes
          </h2>
          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-12 text-center">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400">No episodes yet.</p>
            <Link href={`/movies/${id}/edit`} className="inline-block mt-3">
              <Button size="sm" variant="outline">Add episodes</Button>
            </Link>
          </div>
        </Card>
      ) : isSeries && episodes.length > 0 ? (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
            Episodes ({episodes.length})
          </h2>
          {(() => {
            const selected = episodes[selectedEpisodeIndex];
            const hasVideo = selected?.video_url || selected?.hls_manifest_url;
            return (
              <>
                <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/40 shadow-lg ring-1 ring-slate-200/50 dark:ring-slate-700/50 max-w-2xl mb-4">
                  {hasVideo && selected ? (
                    <HlsQualityPlayer
                      key={`${selected.hls_manifest_url ?? ""}-${selected.video_url ?? ""}`}
                      className="w-full aspect-video object-contain"
                      manifestUrl={selected.hls_manifest_url}
                      fallbackUrl={selected.video_url}
                    />
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
                {selected ? (
                  <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-800/30 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Selected Episode Files
                    </p>
                    <div className="text-xs">
                      <p className="text-slate-500 dark:text-slate-400">Original file</p>
                      {selected.video_url ? (
                        <a
                          href={selected.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 dark:text-red-400 hover:underline break-all"
                        >
                          {selected.video_url}
                        </a>
                      ) : (
                        <p className="text-slate-700 dark:text-slate-300">—</p>
                      )}
                    </div>
                    <div className="text-xs">
                      <p className="text-slate-500 dark:text-slate-400">Transcoded manifest (HLS)</p>
                      {selected.hls_manifest_url ? (
                        <a
                          href={selected.hls_manifest_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 dark:text-red-400 hover:underline break-all"
                        >
                          {selected.hls_manifest_url}
                        </a>
                      ) : (
                        <p className="text-slate-700 dark:text-slate-300">—</p>
                      )}
                    </div>
                    <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Encoding status</p>
                        <p className="text-slate-700 dark:text-slate-300">{renderEncodingStatus(selected.encoding_status)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Encoding error</p>
                        <p className="text-slate-700 dark:text-slate-300 break-all">{selected.encoding_error ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
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
              <dt className="text-slate-500 dark:text-slate-400">Original file URL</dt>
              <dd className="font-medium text-slate-900 dark:text-white mt-0.5 break-all text-xs">
                <a
                  href={movie.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  {movie.video_url}
                </a>
              </dd>
            </div>
          ) : null}
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-slate-500 dark:text-slate-400">Transcoded manifest (HLS)</dt>
            <dd className="font-medium text-slate-900 dark:text-white mt-0.5 break-all text-xs">
              {movie.hls_manifest_url ? (
                <a
                  href={movie.hls_manifest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  {movie.hls_manifest_url}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Encoding status</dt>
            <dd className="font-medium text-slate-900 dark:text-white mt-0.5">{renderEncodingStatus(movie.encoding_status)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-slate-500 dark:text-slate-400">Encoding error</dt>
            <dd className="font-medium text-slate-900 dark:text-white mt-0.5 break-all text-xs">{movie.encoding_error ?? "—"}</dd>
            </div>
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
