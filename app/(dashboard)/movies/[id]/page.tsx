"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MovieHeroSection } from "@/components/movies/detail/MovieHeroSection";
import { MovieMediaSection } from "@/components/movies/detail/MovieMediaSection";
import { SeriesEpisodesSection } from "@/components/movies/detail/SeriesEpisodesSection";
import { MovieDetailsCard } from "@/components/movies/detail/MovieDetailsCard";
import type { SeriesEpisode } from "@/components/movies/detail/types";
import type { Movie } from "@/types";

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
      <div className="flex items-center justify-center min-h-105">
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
      <MovieHeroSection
        movie={movie}
        id={id}
        listHref={listHref}
        isDeleting={isDeleting}
        onDeleteClick={() => setShowDeleteConfirm(true)}
      />

      <MovieMediaSection movie={movie} />

      {/* Episodes (series only) */}
      {isSeries ? (
        <SeriesEpisodesSection
          movieId={id}
          episodes={episodes}
          selectedEpisodeIndex={selectedEpisodeIndex}
          setSelectedEpisodeIndex={setSelectedEpisodeIndex}
        />
      ) : null}

      <MovieDetailsCard movie={movie} />

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
