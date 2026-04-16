import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Movie } from "@/types";
import { formatGenresDisplay } from "@/lib/genre-utils";
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
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(value: number | null | undefined): string {
  if (value == null) return "Not set";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function formatEncodingStatus(status: Movie["encoding_status"]): string {
  if (!status) return "Pending ingest";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const heroBannerUrl = movie.thumbnail_url ?? movie.cover_url;
  const posterUrl = movie.cover_url ?? movie.thumbnail_url;
  const genres = (formatGenresDisplay(movie.genre) || "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);
  const accessLabel = isSeries
    ? `${movie.free_episodes_count ?? 0} free of ${movie.total_episodes ?? 0} episodes`
    : movie.price != null
      ? `$${movie.price.toFixed(2)} one-time purchase`
      : "Pricing still needs to be set";

  return (
    <section className="relative isolate overflow-hidden rounded-[32px] border border-slate-200/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.55)] dark:border-slate-700/80">
      {heroBannerUrl ? (
        <div className="absolute inset-0">
          <Image
            src={heroBannerUrl}
            alt=""
            fill
            unoptimized
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-linear-to-br from-slate-950/92 via-slate-950/86 to-slate-900/78" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800" />
      )}

      <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-red-500/18 blur-3xl" />
      <div className="absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-cyan-500/14 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-white/10 to-transparent" />

      <div className="relative px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={listHref}
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>

          <div className="flex flex-wrap gap-2">
            <Link href={`/movies/${id}/edit`}>
              <Button
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/15 hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white/15"
                leftIcon={<Pencil className="h-4 w-4" />}
              >
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-end">
          <div className="mx-auto w-full max-w-60 lg:mx-0">
            <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 shadow-2xl shadow-slate-950/30 backdrop-blur">
              <div className="aspect-2/3 overflow-hidden bg-slate-800/70">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={movie.title}
                    width={240}
                    height={360}
                    unoptimized
                    priority={!heroBannerUrl}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/40">
                    <Film className="w-16 h-16" />
                  </div>
                )}
              </div>
              <div className="space-y-3 border-t border-white/10 px-4 py-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.24em] text-white/55">Library status</span>
                  <Badge variant={statusBadge[movie.status]}>{movie.status}</Badge>
                </div>
                <p className="text-sm text-white/78">
                  {movie.updated_at
                    ? `Updated ${formatDate(movie.updated_at)}`
                    : "Freshly added to the catalog"}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-6 text-white">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className="border-white/12 bg-white/10 text-white" variant={isSeries ? "info" : "default"}>
                  {isSeries ? "Series" : "Single Movie"}
                </Badge>
                <Badge variant={statusBadge[movie.status]}>{movie.status}</Badge>
                <Badge className="border-white/12 bg-white/10 text-white" variant="neutral">
                  {formatEncodingStatus(movie.encoding_status)}
                </Badge>
                {movie.title_kh ? (
                  <Badge className="border-white/12 bg-white/10 text-white" variant="neutral">
                    Khmer title available
                  </Badge>
                ) : null}
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Movie Overview</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">
                {movie.title}
              </h1>
              {movie.title_kh ? (
                <p className="mt-2 text-base text-white/70 md:text-lg">{movie.title_kh}</p>
              ) : null}
            </div>

            <p className="max-w-4xl text-sm leading-7 text-white/78 md:text-base">
              {movie.description ||
                "Add a synopsis to help your team quickly understand what this title is about before publishing or promoting it."}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-white/55">Release</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <CalendarDays className="h-4 w-4 text-white/65" />
                  {formatDate(movie.release_date)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-white/55">Duration</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <Clock3 className="h-4 w-4 text-white/65" />
                  {formatDuration(movie.duration)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                  {isSeries ? "Access" : "Price"}
                </p>
                {isSeries ? (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    <Tv className="h-4 w-4 text-white/65" />
                    {accessLabel}
                  </p>
                ) : (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    <Clapperboard className="h-4 w-4 text-white/65" />
                    {accessLabel}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-white/55">Encoding</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <Film className="h-4 w-4 text-white/65" />
                  {formatEncodingStatus(movie.encoding_status)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Genres</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {genres.length > 0 ? (
                    genres.map((genre) => (
                      <span
                        key={genre}
                        className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
                      >
                        {genre}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-white/70">Add genres to improve discovery and internal sorting.</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Cast & activity</p>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  {movie.cast || "No cast listed yet. Adding cast helps editors and marketers recognize the title faster."}
                </p>
                <p className="mt-4 text-xs text-white/55">
                  Created {formatDate(movie.created_at)} · Last updated {formatDate(movie.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
