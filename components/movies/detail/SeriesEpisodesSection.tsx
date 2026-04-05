import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HlsQualityPlayer } from "@/components/movies/HlsQualityPlayer";
import type { SeriesEpisode } from "@/components/movies/detail/types";
import { Video } from "lucide-react";

function formatEncodingStatus(status?: string | null): string {
  if (!status) return "not_started";
  return status;
}

function formatDuration(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value} min`;
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
  if (episodes.length === 0) {
    return (
      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
          Episodes
        </h2>
        <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-12 text-center">
          <Video className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No episodes yet.</p>
          <Link href={`/movies/${movieId}/edit`} className="inline-block mt-3">
            <Button size="sm" variant="outline">Add episodes</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const selectedEpisode = episodes[selectedEpisodeIndex];
  const hasEpisodeVideo = Boolean(selectedEpisode?.video_url || selectedEpisode?.hls_manifest_url);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
        Episodes ({episodes.length})
      </h2>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-140 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Episode List
            </p>
          </div>
          <div className="p-2 space-y-1.5">
            {episodes.map((ep, i) => {
              const active = i === selectedEpisodeIndex;
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => setSelectedEpisodeIndex(i)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    active
                      ? "border-red-500/40 bg-red-500/10 dark:bg-red-500/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        Episode {ep.episode_number}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {ep.title || `Episode ${ep.episode_number}`}
                      </p>
                    </div>
                    {ep.is_free_preview ? <Badge variant="success">Free</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDuration(ep.duration)}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/40 ring-1 ring-slate-200/60 dark:ring-slate-700/70">
            {selectedEpisode && hasEpisodeVideo ? (
              <HlsQualityPlayer
                key={`${selectedEpisode.hls_manifest_url ?? ""}-${selectedEpisode.video_url ?? ""}`}
                className="w-full aspect-video object-contain"
                manifestUrl={selectedEpisode.hls_manifest_url}
                fallbackUrl={selectedEpisode.video_url}
              />
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <Video className="w-8 h-8" />
                <span className="text-sm">
                  {selectedEpisode ? "No video for this episode" : "Select an episode"}
                </span>
              </div>
            )}
          </div>

          {selectedEpisode ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Episode Details
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Playing Episode {selectedEpisode.episode_number}
                {selectedEpisode.title ? ` — ${selectedEpisode.title}` : ""}
              </p>

              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Encoding status</p>
                  <p className="text-slate-700 dark:text-slate-300">{formatEncodingStatus(selectedEpisode.encoding_status)}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Encoding error</p>
                  <p className="text-slate-700 dark:text-slate-300 break-all">{selectedEpisode.encoding_error ?? "—"}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Original file</p>
                  {selectedEpisode.video_url ? (
                    <a
                      href={selectedEpisode.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 dark:text-red-400 hover:underline break-all"
                    >
                      {selectedEpisode.video_url}
                    </a>
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300">—</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Transcoded manifest (HLS)</p>
                  {selectedEpisode.hls_manifest_url ? (
                    <a
                      href={selectedEpisode.hls_manifest_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 dark:text-red-400 hover:underline break-all"
                    >
                      {selectedEpisode.hls_manifest_url}
                    </a>
                  ) : (
                    <p className="text-slate-700 dark:text-slate-300">—</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
