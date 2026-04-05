import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Movie } from "@/types";
import {
  ArrowLeft,
  CalendarDays,
  Clapperboard,
  Clock3,
  Film,
  Pencil,
  Trash2,
  Tv,
} from "lucide-react";

const statusBadge: Record<Movie["status"], "default" | "success" | "warning" | "neutral"> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDuration(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value} min`;
}

interface MovieHeroSectionProps {
  movie: Movie;
  id: string;
  listHref: string;
  isDeleting: boolean;
  onDeleteClick: () => void;
}

export function MovieHeroSection({ movie, id, listHref, isDeleting, onDeleteClick }: MovieHeroSectionProps) {
  const isSeries = movie.type === "series";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-linear-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-slate-800/50 p-6 md:p-8">
      <div className="absolute -top-14 -right-14 h-44 w-44 rounded-full bg-red-500/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={listHref}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>

          <div className="flex flex-wrap gap-2">
            <Link href={`/movies/${id}/edit`}>
              <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
                Edit
              </Button>
            </Link>
            <Button
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={onDeleteClick}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="w-full max-w-55 mx-auto lg:mx-0">
            <div className="aspect-2/3 rounded-2xl overflow-hidden ring-1 ring-slate-200/60 dark:ring-slate-700/70 shadow-lg bg-slate-200 dark:bg-slate-800">
              {movie.thumbnail_url ? (
                <img src={movie.thumbnail_url} alt={movie.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <Film className="w-16 h-16" />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant={isSeries ? "info" : "default"}>
                  {isSeries ? "Series" : "Single Movie"}
                </Badge>
                <Badge variant={statusBadge[movie.status]}>{movie.status}</Badge>
                {movie.title_kh ? <Badge variant="neutral">Khmer title available</Badge> : null}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                {movie.title}
              </h1>
              {movie.title_kh ? (
                <p className="mt-1 text-slate-600 dark:text-slate-400">{movie.title_kh}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <Card padding="sm" className="rounded-xl!">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Genre</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{movie.genre ?? "—"}</p>
              </Card>
              <Card padding="sm" className="rounded-xl!">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Release</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  {formatDate(movie.release_date)}
                </p>
              </Card>
              <Card padding="sm" className="rounded-xl!">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Duration</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-slate-500" />
                  {formatDuration(movie.duration)}
                </p>
              </Card>
              <Card padding="sm" className="rounded-xl!">
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isSeries ? "Access" : "Price"}
                </p>
                {isSeries ? (
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                    <Tv className="h-4 w-4 text-slate-500" />
                    {movie.free_episodes_count ?? 0} free · {movie.total_episodes ?? "—"} eps
                  </p>
                ) : (
                  <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
                    <Clapperboard className="h-4 w-4" />
                    ${movie.price?.toFixed(2) ?? "—"}
                  </p>
                )}
              </Card>
            </div>

            {movie.description ? (
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-3">
                {movie.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
