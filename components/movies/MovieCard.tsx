import Link from "next/link";
import type { Movie } from "@/types";

interface MovieCardProps {
  movie: Movie;
}

function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  return `${months[d.getMonth()]}. ${d.getDate()}, ${d.getFullYear()}`;
}

export function MovieCard({ movie }: MovieCardProps) {
  const isSeries = movie.type === "series";
  const displayDate = formatDisplayDate(movie.release_date);
  const tagLabel = movie.genre || (isSeries ? "Series" : "Movie");

  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-lg"
    >
      <div className="rounded-xl overflow-hidden bg-slate-900/80 border border-slate-800/80 shadow-sm transition-all duration-200 group-hover:border-red-500/70">
        {/* Poster with aspect ratio 2:3 */}
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {movie.thumbnail_url ? (
            <img
              src={movie.thumbnail_url}
              alt={movie.title}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800/50 text-slate-600">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
          )}
          {/* Top-left tag/badge */}
          <div className="absolute top-1.5 left-1.5">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-medium">
              {tagLabel}
            </span>
          </div>
        </div>
        {/* Title + date */}
        <div className="pt-2 px-2 pb-2">
          <h3 className="font-medium text-white text-xs leading-tight line-clamp-2 group-hover:text-red-400 transition-colors">
            {movie.title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{displayDate}</p>
        </div>
      </div>
    </Link>
  );
}
