"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { Movie } from "@/types";

const statusBadge: Record<Movie["status"], "default" | "success" | "warning" | "neutral"> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/movies/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMovie(data?.movie ?? null))
      .catch(() => setMovie(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-500">Movie not found.</p>
        <Link href="/movies">
          <Button variant="secondary" className="mt-4">
            Back to Movies
          </Button>
        </Link>
      </div>
    );
  }

  const isSeries = movie.type === "series";
  const listHref = isSeries ? "/movies/series" : "/movies/single";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={listHref}>
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 flex-shrink-0">
          <div className="aspect-[2/3] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            {movie.thumbnail_url ? (
              <img
                src={movie.thumbnail_url}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-24 h-24 text-slate-400 dark:text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{movie.title}</h1>
              <Badge variant={isSeries ? "info" : "default"}>
                {isSeries ? "Series" : "Single Movie"}
              </Badge>
              <Badge variant={statusBadge[movie.status]}>{movie.status}</Badge>
            </div>
            <div className="flex gap-4 mt-2 text-slate-600 dark:text-slate-400 text-sm flex-wrap">
              {movie.genre && <span>{movie.genre}</span>}
              {movie.release_date && (
                <span>{new Date(movie.release_date).toLocaleDateString()}</span>
              )}
              {movie.duration && <span>{movie.duration} min</span>}
            </div>
          </div>

          {/* Pricing / Access info */}
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">
              {isSeries ? "Access" : "Pricing"}
            </h3>
            {isSeries ? (
              <div className="space-y-2">
                <p className="text-slate-700 dark:text-white">
                  <span className="text-slate-600 dark:text-slate-500">Subscription required</span> — Users must have an active subscription to watch.
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-900 dark:text-white">{movie.free_episodes_count ?? 0} free preview episodes</span> — Users can watch without subscribing.
                </p>
                {movie.total_episodes != null && (
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {movie.total_episodes} total episodes
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xl font-bold text-emerald-400">
                ${movie.price?.toFixed(2) ?? "—"} <span className="text-sm font-normal text-slate-600 dark:text-slate-400">one-time purchase</span>
              </p>
            )}
          </Card>

          {movie.description && (
            <Card>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Description</h3>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{movie.description}</p>
            </Card>
          )}

          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Details</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Type</dt>
                <dd className="text-slate-900 dark:text-white font-medium">{movie.type}</dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Status</dt>
                <dd className="text-slate-900 dark:text-white">{movie.status}</dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Genre</dt>
                <dd className="text-slate-900 dark:text-white">{movie.genre ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Release Date</dt>
                <dd className="text-slate-900 dark:text-white">
                  {movie.release_date
                    ? new Date(movie.release_date).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Duration</dt>
                <dd className="text-slate-900 dark:text-white">{movie.duration ? `${movie.duration} min` : "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-600 dark:text-slate-500">Video URL</dt>
                <dd className="text-slate-900 dark:text-white break-all">{movie.video_url ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <div className="flex gap-3">
            <Button>Edit Movie</Button>
            <Button variant="outline">View Analytics</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
