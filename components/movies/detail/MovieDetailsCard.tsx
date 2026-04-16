import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Movie } from "@/types";
import { formatGenresDisplay } from "@/lib/genre-utils";
import {
  AlertTriangle,
  CalendarDays,
  Clapperboard,
  ExternalLink,
  FileText,
  Layers3,
  MonitorPlay,
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Admin Snapshot
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Catalog health
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            The essential metadata your team needs while reviewing this title.
          </p>
        </div>
        <Badge variant={movie.encoding_error ? "danger" : "success"}>
          {movie.encoding_error ? "Needs attention" : "Healthy"}
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            <Layers3 className="h-4 w-4" />
            Type
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900 capitalize dark:text-white">{movie.type}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            <MonitorPlay className="h-4 w-4" />
            Encoding
          </p>
          <p className="mt-3 text-sm font-semibold capitalize text-slate-900 dark:text-white">
            {formatTitleCase(encodingStatus)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            <Clapperboard className="h-4 w-4" />
            Media assets
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{assetCount} connected</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-4 w-4" />
            Updated
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(movie.updated_at)}</p>
        </div>
      </div>

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

      <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
          <MonitorPlay className="h-4 w-4" />
          Resource Links
        </p>
        <div className="mt-4 space-y-3">
          {resourceLinks.length > 0 ? (
            resourceLinks.map((resource) => (
              <ResourceLink
                key={resource.href}
                href={resource.href}
                label={resource.label}
                hint={resource.hint}
              />
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              No media links available yet. Uploading source video or adding a trailer will populate this area.
            </p>
          )}
        </div>
      </div>

      <div
        className={`mt-6 rounded-[24px] border p-5 ${
          movie.encoding_error
            ? "border-red-200/80 bg-red-50/80 dark:border-red-500/20 dark:bg-red-500/10"
            : "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
        }`}
      >
        <p
          className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] ${
            movie.encoding_error ? "text-red-600 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {movie.encoding_error ? <AlertTriangle className="h-4 w-4" /> : <MonitorPlay className="h-4 w-4" />}
          Encoding Health
        </p>
        <p
          className={`mt-3 text-sm leading-6 ${
            movie.encoding_error ? "text-red-900 dark:text-red-100" : "text-emerald-900 dark:text-emerald-100"
          }`}
        >
          {movie.encoding_error || "No encoding errors reported. Playback assets look healthy from an admin perspective."}
        </p>
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
          <FileText className="h-4 w-4" />
          Full Synopsis
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
          {movie.description ||
            "No description yet. A concise synopsis helps your admin team, support staff, and marketers understand the title without opening the edit form."}
        </p>
      </div>
    </Card>
  );
}
