import { Card } from "@/components/ui/Card";
import type { Movie } from "@/types";
import { ExternalLink } from "lucide-react";

function formatEncodingStatus(status?: string | null): string {
  if (!status) return "not_started";
  return status;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDuration(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value} min`;
}

interface MovieDetailsCardProps {
  movie: Movie;
}

export function MovieDetailsCard({ movie }: MovieDetailsCardProps) {
  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        Details
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Technical metadata and media resources
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Type</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{movie.type}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{movie.status}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Encoding status</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatEncodingStatus(movie.encoding_status)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Duration</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatDuration(movie.duration)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Genre</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{movie.genre ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Release date</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatDate(movie.release_date)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Added</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatDate(movie.created_at)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-800/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Updated</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatDate(movie.updated_at)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/30 p-3">
        {movie.video_url ? (
          <a
            href={movie.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">Original file URL</span>
            <ExternalLink className="h-4 w-4 text-slate-500 shrink-0" />
          </a>
        ) : null}

        {movie.hls_manifest_url ? (
          <a
            href={movie.hls_manifest_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">Transcoded manifest (HLS)</span>
            <ExternalLink className="h-4 w-4 text-slate-500 shrink-0" />
          </a>
        ) : null}

        {movie.trailer_url ? (
          <a
            href={movie.trailer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">Trailer URL</span>
            <ExternalLink className="h-4 w-4 text-slate-500 shrink-0" />
          </a>
        ) : null}

        {!movie.video_url && !movie.hls_manifest_url && !movie.trailer_url ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 px-2 py-1">No media links available.</p>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">Encoding error</p>
        <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 break-all">{movie.encoding_error ?? "—"}</p>
      </div>

      {movie.description ? (
        <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</p>
          <p className="mt-2 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
            {movie.description}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
