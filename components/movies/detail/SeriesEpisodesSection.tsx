import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HlsQualityPlayer } from "@/components/movies/HlsQualityPlayer";
import type { SeriesEpisode } from "@/components/movies/detail/types";
import { ExternalLink, Pencil, Video } from "lucide-react";

function formatEncodingStatus(status?: string | null): string {
  if (!status) return "not started";
  return status.replace(/_/g, " ");
}

function formatDuration(value: number | null | undefined): string {
  if (value == null) return "Not set";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEncodingVariant(status?: string | null): "neutral" | "info" | "success" | "danger" {
  switch (status) {
    case "ready":
      return "success";
    case "processing":
      return "info";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

interface SeriesEpisodesSectionProps {
  movieId: string;
  episodes: SeriesEpisode[];
  selectedEpisodeIndex: number;
  setSelectedEpisodeIndex: (index: number) => void;
}

export function SeriesEpisodesSection({
  movieId,
  episodes,
  selectedEpisodeIndex,
  setSelectedEpisodeIndex,
}: SeriesEpisodesSectionProps) {
  const safeSelectedEpisodeIndex =
    selectedEpisodeIndex >= 0 && selectedEpisodeIndex < episodes.length ? selectedEpisodeIndex : 0;
  const previewCount = episodes.filter((episode) => episode.is_free_preview).length;
  const readyCount = episodes.filter((episode) => episode.encoding_status === "ready").length;

  if (episodes.length === 0) {
    return (
      <Card className="rounded-[28px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Episodes
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Episode browser
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Add episodes to preview playback, review access rules, and keep a clean publishing workflow for your series.
            </p>
          </div>
          <Link href={`/movies/${movieId}/edit`}>
            <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
              Manage episodes
            </Button>
          </Link>
        </div>

        <div className="mt-6 rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400">
            <Video className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">No episodes yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Once you upload episodes, this area becomes a dedicated review workspace for playback, free previews, and encoding health.
          </p>
          <Link href={`/movies/${movieId}/edit`} className="mt-5 inline-block">
            <Button size="sm" variant="outline">
              Add first episode
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const selectedEpisode = episodes[safeSelectedEpisodeIndex];
  const hasEpisodeVideo = Boolean(selectedEpisode?.video_url || selectedEpisode?.hls_manifest_url);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Episodes
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Episode browser
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Review each episode from one place, including playback, free-preview access, and encoding readiness.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{episodes.length} total</Badge>
          <Badge variant="success">{previewCount} free preview</Badge>
          <Badge variant={readyCount === episodes.length ? "success" : "neutral"}>{readyCount} ready</Badge>
          <Link href={`/movies/${movieId}/edit`}>
            <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
              Manage episodes
            </Button>
          </Link>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden rounded-[28px]">
        <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                Episode list
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Pick an episode to preview its stream and review technical details.
              </p>
            </div>

            <div className="max-h-[42rem] space-y-2 overflow-y-auto p-3">
              {episodes.map((ep, i) => {
                const active = i === safeSelectedEpisodeIndex;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => setSelectedEpisodeIndex(i)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                      active
                        ? "border-red-500/35 bg-red-500/10 shadow-sm dark:bg-red-500/15"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                              active
                                ? "bg-red-500 text-white"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {ep.episode_number}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {ep.title || `Episode ${ep.episode_number}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Added {formatDate(ep.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={getEncodingVariant(ep.encoding_status)} className="capitalize">
                            {formatEncodingStatus(ep.encoding_status)}
                          </Badge>
                          <Badge variant="neutral">{formatDuration(ep.duration)}</Badge>
                          {ep.is_free_preview ? <Badge variant="success">Free preview</Badge> : null}
                        </div>
                      </div>
                      {active ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600 dark:bg-red-500/15 dark:text-red-300">
                          Live
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 p-4 md:p-6">
            {selectedEpisode ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      Now previewing
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                      Episode {selectedEpisode.episode_number}
                      {selectedEpisode.title ? ` · ${selectedEpisode.title}` : ""}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Use this panel to validate playback quality, preview eligibility, and encoding state before you publish changes.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getEncodingVariant(selectedEpisode.encoding_status)} className="capitalize">
                      {formatEncodingStatus(selectedEpisode.encoding_status)}
                    </Badge>
                    <Badge variant="neutral">{formatDuration(selectedEpisode.duration)}</Badge>
                    {selectedEpisode.is_free_preview ? <Badge variant="success">Free preview</Badge> : null}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] bg-slate-950 ring-1 ring-slate-200/80 dark:ring-slate-800">
                  {hasEpisodeVideo ? (
                    <HlsQualityPlayer
                      key={`${selectedEpisode.hls_manifest_url ?? ""}-${selectedEpisode.video_url ?? ""}`}
                      className="aspect-video w-full object-contain bg-black"
                      manifestUrl={selectedEpisode.hls_manifest_url}
                      fallbackUrl={selectedEpisode.video_url}
                    />
                  ) : (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
                      <Video className="h-8 w-8" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">No playback source attached</p>
                        <p className="max-w-md text-sm leading-6 text-slate-400">
                          Upload or replace the episode video from the edit screen to preview it here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Duration
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatDuration(selectedEpisode.duration)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Added
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatDate(selectedEpisode.created_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Encoding
                    </p>
                    <p className="mt-3 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                      {formatEncodingStatus(selectedEpisode.encoding_status)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                      Episode notes
                    </p>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-3 dark:border-slate-800">
                        <dt className="text-slate-500 dark:text-slate-400">Episode ID</dt>
                        <dd className="max-w-[65%] text-right font-mono text-xs text-slate-900 break-all dark:text-white">
                          {selectedEpisode.id}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-3 dark:border-slate-800">
                        <dt className="text-slate-500 dark:text-slate-400">Preview access</dt>
                        <dd className="text-right font-medium text-slate-900 dark:text-white">
                          {selectedEpisode.is_free_preview ? "Included in free preview" : "Members only"}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-slate-500 dark:text-slate-400">Encoding error</dt>
                        <dd className="max-w-[65%] text-right text-slate-900 dark:text-white">
                          {selectedEpisode.encoding_error || "No encoding errors reported"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                      Playback links
                    </p>
                    <div className="mt-4 space-y-3">
                      {selectedEpisode.video_url ? (
                        <a
                          href={selectedEpisode.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/80"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Original episode file</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              Direct upload source for this episode.
                            </p>
                          </div>
                          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        </a>
                      ) : null}
                      {selectedEpisode.hls_manifest_url ? (
                        <a
                          href={selectedEpisode.hls_manifest_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/80"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">HLS manifest</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              Adaptive playback manifest for streaming QA.
                            </p>
                          </div>
                          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        </a>
                      ) : null}
                      {!selectedEpisode.video_url && !selectedEpisode.hls_manifest_url ? (
                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                          No playback links yet. Add or replace the episode video from the edit view.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </section>
  );
}
