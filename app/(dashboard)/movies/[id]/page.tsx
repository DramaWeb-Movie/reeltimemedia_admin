"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { MovieHeroSection } from "@/components/movies/detail/MovieHeroSection";
import { MovieMediaSection } from "@/components/movies/detail/MovieMediaSection";
import { SeriesEpisodesSection } from "@/components/movies/detail/SeriesEpisodesSection";
import { MovieDetailsCard } from "@/components/movies/detail/MovieDetailsCard";
import type { SeriesEpisode } from "@/components/movies/detail/types";
import type { Movie } from "@/types";
import { Film } from "lucide-react";

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
      <PageLoadingState
        title="Loading movie workspace"
        description="Bringing together artwork, playback, and admin details."
      />
    );
  }

  if (!movie) {
    return (
      <Card className="mx-auto max-w-2xl rounded-[32px] border-dashed px-6 py-14 text-center md:px-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400">
          <Film className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">Movie not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          This title may have been removed, or the link may be out of date. Head back to the movie library to continue managing your catalog.
        </p>
        <Link href="/movies" className="mt-6 inline-block">
          <Button variant="secondary">Back to Movies</Button>
        </Link>
      </Card>
    );
  }

  const isSeries = movie.type === "series";

  return (
    <div className="space-y-8 pb-8">
      <MovieHeroSection
        movie={movie}
        id={id}
        listHref={listHref}
        isDeleting={isDeleting}
        onDeleteClick={() => setShowDeleteConfirm(true)}
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <MovieMediaSection movie={movie} />

          {isSeries ? (
            <SeriesEpisodesSection
              movieId={id}
              episodes={episodes}
              selectedEpisodeIndex={selectedEpisodeIndex}
              setSelectedEpisodeIndex={setSelectedEpisodeIndex}
            />
          ) : null}
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <MovieDetailsCard movie={movie} />
        </div>
      </div>

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
