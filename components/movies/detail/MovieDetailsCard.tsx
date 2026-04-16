import { Card } from "@/components/ui/Card";
import type { Movie } from "@/types";
import { formatGenresDisplay } from "@/lib/genre-utils";
import {
  ExternalLink,
  UserRound,
} from "lucide-react";

function formatEncodingStatus(status?: string | null): string {
  if (!status) return "pending";
  return status;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
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

function formatTitleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DetailRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 py-3 last:border-b-0 last:pb-0 dark:border-slate-800">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={`max-w-[65%] text-right text-sm font-medium text-slate-900 dark:text-white ${
          mono ? "font-mono text-xs break-all" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ResourceLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/80"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
    </a>
  );
}

interface MovieDetailsCardProps {
  movie: Movie;
}

export function MovieDetailsCard({ movie }: MovieDetailsCardProps) {
  const encodingStatus = formatEncodingStatus(movie.encoding_status);
  const genres = formatGenresDisplay(movie.genre) || "Not set";
  const assetCount = [
    movie.thumbnail_url,
    movie.cover_url,
    movie.promotion_banner_url,
    movie.video_url || movie.hls_manifest_url,
    movie.trailer_url,
  ].filter(Boolean).length;
  const accessSummary =
    movie.type === "series"
      ? `${movie.free_episodes_count ?? 0} free · ${movie.total_episodes ?? 0} episodes`
      : movie.price != null
        ? `$${movie.price.toFixed(2)} purchase`
        : "Price not set";
  const resourceLinks = [
    movie.video_url
      ? {
          href: movie.video_url,
          label: "Original video file",
          hint: "Raw source uploaded to the platform.",
        }
      : null,
    movie.hls_manifest_url
      ? {
          href: movie.hls_manifest_url,
          label: "Transcoded HLS manifest",
          hint: "Adaptive playback manifest used by the player.",
        }
      : null,
    movie.trailer_url
      ? {
          href: movie.trailer_url,
          label: "Trailer asset",
          hint: "Marketing or promotional video reference.",
        }
      : null,
    movie.promotion_banner_url
      ? {
          href: movie.promotion_banner_url,
          label: "Promotion banner image",
          hint: "Dedicated artwork for promoted placements.",
        }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; hint: string }>;

  return (
    <Card className="rounded-[28px]">            
      <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
          Metadata
        </p>
        <dl className="mt-4">
          <DetailRow label="Movie ID" value={movie.id} mono />
          <DetailRow label="Status" value={formatTitleCase(movie.status)} />
          <DetailRow label="Release date" value={formatDate(movie.release_date)} />
          <DetailRow label="Duration" value={formatDuration(movie.duration)} />
          <DetailRow label="Genres" value={genres} />
          <DetailRow label={movie.type === "series" ? "Access" : "Price"} value={accessSummary} />
          <DetailRow label="Promotion banner" value={movie.promotion_banner_url ? "Configured" : "Not set"} />
          {movie.type === "series" && movie.subscription_plan_id ? (
            <DetailRow label="Plan ID" value={movie.subscription_plan_id} mono />
          ) : null}
          <DetailRow label="Created" value={formatDate(movie.created_at)} />
        </dl>
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
          <UserRound className="h-4 w-4" />
          Cast
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {movie.cast || "No cast information yet. Adding people here makes the library friendlier for editors and support teams."}
        </p>
      </div>      
    </Card>
  );
}
