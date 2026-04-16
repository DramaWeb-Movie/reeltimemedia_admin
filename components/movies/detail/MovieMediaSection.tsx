import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { HlsQualityPlayer } from "@/components/movies/HlsQualityPlayer";
import { getYouTubeEmbedUrl, isLikelyDirectVideoUrl } from "@/lib/youtube-embed";
import type { Movie } from "@/types";
import { ExternalLink, PlayCircle, Video } from "lucide-react";

interface MovieMediaSectionProps {
  movie: Movie;
}

export function MovieMediaSection({ movie }: MovieMediaSectionProps) {
  const hasMainVideo = Boolean(movie.video_url || movie.hls_manifest_url);
  const hasTrailer = Boolean(movie.trailer_url);
  const trailerUrl = movie.trailer_url?.trim() ?? "";
  const youtubeEmbedSrc = trailerUrl ? getYouTubeEmbedUrl(trailerUrl) : null;
  const trailerAsDirectVideo = Boolean(trailerUrl && !youtubeEmbedSrc && isLikelyDirectVideoUrl(trailerUrl));
  const videoPoster = movie.thumbnail_url ?? movie.cover_url ?? undefined;
  const trailerTypeLabel = youtubeEmbedSrc
    ? "YouTube embed"
    : trailerAsDirectVideo
      ? "Direct video"
      : trailerUrl
        ? "External link"
        : null;

  if (!hasMainVideo && !hasTrailer) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Media Center
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Playback and promo assets
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Review what viewers will see before publishing. This gives you the main stream, trailer, and asset health in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasMainVideo ? <Badge variant="success">Main video ready</Badge> : null}
          {hasTrailer ? <Badge variant="info">Trailer attached</Badge> : null}
        </div>
      </div>

      <div className={`grid gap-6 ${hasMainVideo && hasTrailer ? "2xl:grid-cols-2" : ""}`}>
        {hasMainVideo ? (
          <Card padding="none" className="overflow-hidden rounded-[28px] border-slate-200/80 bg-linear-to-br from-slate-950 via-slate-900 to-slate-900 text-white dark:border-slate-800/80">
            <div className="border-b border-white/10 px-5 py-5 md:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-white/55">
                    <PlayCircle className="h-4 w-4" />
                    Feature Stream
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-white">Main Video</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                    Preview the primary playback source exactly where your team expects to QA it.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {movie.hls_manifest_url ? (
                    <Badge className="border-white/12 bg-white/10 text-white" variant="neutral">
                      Adaptive HLS
                    </Badge>
                  ) : null}
                  {movie.video_url ? (
                    <Badge className="border-white/12 bg-white/10 text-white" variant="neutral">
                      Original source
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="p-3 md:p-5">
              <div className="overflow-hidden rounded-[24px] bg-black ring-1 ring-white/10">
                <HlsQualityPlayer
                  key={`${movie.hls_manifest_url ?? ""}-${movie.video_url ?? ""}`}
                  className="aspect-video w-full object-contain bg-black"
                  manifestUrl={movie.hls_manifest_url}
                  fallbackUrl={movie.video_url}
                  poster={videoPoster}
                />
              </div>
            </div>
          </Card>
        ) : null}

        {hasTrailer ? (
          <Card padding="none" className="overflow-hidden rounded-[28px] border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900/70">
            <div className="border-b border-slate-200/70 px-5 py-5 dark:border-slate-800 md:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                    <Video className="h-4 w-4" />
                    Promotional Asset
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">Trailer</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Keep promotional media close to the main stream so reviews and approvals move faster.
                  </p>
                </div>
                {trailerTypeLabel ? <Badge variant="info">{trailerTypeLabel}</Badge> : null}
              </div>
            </div>

            <div className="p-3 md:p-5">
              <div className="overflow-hidden rounded-[24px] bg-slate-50 ring-1 ring-slate-200/70 dark:bg-slate-950 dark:ring-slate-800">
                <div className="aspect-video w-full">
                  {youtubeEmbedSrc ? (
                    <iframe
                      title="Trailer"
                      className="h-full w-full border-0"
                      src={`${youtubeEmbedSrc}?rel=0`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : trailerAsDirectVideo ? (
                    <video
                      className="h-full w-full object-contain bg-black"
                      src={trailerUrl}
                      controls
                      playsInline
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : trailerUrl ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                      <div className="rounded-2xl bg-red-500/10 p-3 text-red-500 dark:bg-red-500/15 dark:text-red-400">
                        <ExternalLink className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          This trailer opens as an external link
                        </p>
                        <p className="max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                          The URL is not a supported YouTube embed or direct video file, so we keep the experience simple and safe here.
                        </p>
                      </div>
                      <a
                        href={trailerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open trailer
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
