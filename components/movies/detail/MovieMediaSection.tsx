import { Card } from "@/components/ui/Card";
import { HlsQualityPlayer } from "@/components/movies/HlsQualityPlayer";
import type { Movie } from "@/types";
import { PlayCircle, Video } from "lucide-react";

interface MovieMediaSectionProps {
  movie: Movie;
}

export function MovieMediaSection({ movie }: MovieMediaSectionProps) {
  const hasMainVideo = Boolean(movie.video_url || movie.hls_manifest_url);
  const hasTrailer = Boolean(movie.trailer_url);

  if (!hasMainVideo && !hasTrailer) {
    return null;
  }

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      {hasMainVideo ? (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 inline-flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Main Video
          </h2>
          <div className="rounded-2xl overflow-hidden bg-black/40 ring-1 ring-slate-200/60 dark:ring-slate-700/70">
            <HlsQualityPlayer
              className="w-full aspect-video object-contain"
              manifestUrl={movie.hls_manifest_url}
              fallbackUrl={movie.video_url}
              poster={movie.thumbnail_url ?? undefined}
            />
          </div>
        </Card>
      ) : null}

      {hasTrailer ? (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 inline-flex items-center gap-2">
            <Video className="h-4 w-4" />
            Trailer
          </h2>
          <div className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/40 ring-1 ring-slate-200/60 dark:ring-slate-700/70">
            <div className="aspect-video w-full">
              {movie.trailer_url?.includes("youtube.com") || movie.trailer_url?.includes("youtu.be") ? (
                <iframe
                  title="Trailer"
                  className="w-full h-full"
                  src={
                    movie.trailer_url?.includes("youtu.be/")
                      ? `https://www.youtube.com/embed/${movie.trailer_url.split("youtu.be/")[1]?.split("?")[0] ?? ""}`
                      : movie.trailer_url?.replace("watch?v=", "embed/").split("&")[0]
                  }
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  className="w-full h-full object-contain"
                  src={movie.trailer_url ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
