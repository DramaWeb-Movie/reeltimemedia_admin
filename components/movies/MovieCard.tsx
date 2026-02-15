import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Movie } from "@/types";

interface MovieCardProps {
  movie: Movie;
}

const statusBadge: Record<Movie["status"], "default" | "success" | "warning" | "neutral"> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};

export function MovieCard({ movie }: MovieCardProps) {
  const formattedDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString()
    : "—";
  const duration = movie.duration ? `${movie.duration} min` : "—";
  const isSeries = movie.type === "series";

  return (
    <Link href={`/movies/${movie.id}`}>
      <Card className="cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
        <div className="flex gap-4">
          <div className="w-24 h-32 flex-shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
            {movie.thumbnail_url ? (
              <img
                src={movie.thumbnail_url}
                alt={movie.title}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <svg
                className="w-10 h-10 text-slate-600"
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
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors truncate">
                {movie.title}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={isSeries ? "info" : "default"}>
                  {isSeries ? "Series" : "Single"}
                </Badge>
                <Badge variant={statusBadge[movie.status]}>{movie.status}</Badge>
              </div>
            </div>
            {movie.genre && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{movie.genre}</p>
            )}
            {movie.description && (
              <p className="text-sm text-slate-600 dark:text-slate-500 mt-2 line-clamp-2">
                {movie.description}
              </p>
            )}
            <div className="flex gap-4 mt-3 text-xs text-slate-600 dark:text-slate-500 flex-wrap">
              <span>{formattedDate}</span>
              <span>{duration}</span>
              {isSeries ? (
                <span className="text-red-400">
                  Subscription • {movie.free_episodes_count ?? 0} free eps
                </span>
              ) : (
                movie.price != null && (
                  <span className="text-emerald-400">${movie.price.toFixed(2)}</span>
                )
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
