import { memo } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { formatBytes } from "@/lib/upload/parallel-uploader";
import type { EpisodeInput } from "@/types";
import type { ArtworkRole } from "@/lib/constants/movie-artwork";
import { ARTWORK_ROLES_ORDER, MOVIE_ARTWORK_SLOTS, MOVIE_ARTWORK_ASPECT_CLASS } from "@/lib/constants/movie-artwork";

type SeriesAccess = "membership" | "free";

type StepReviewCardProps = {
  artworkByRole: Record<ArtworkRole, File | null>;
  artworkPreviewUrls: Record<ArtworkRole, string | null>;
  seriesAccess: SeriesAccess;
  title: string;
  titleKh: string;
  description: string;
  cast: string;
  genres: string[];
  trailerUrl: string;
  episodes: EpisodeInput[];
};

export const StepReviewCard = memo(function StepReviewCard({
  artworkByRole,
  artworkPreviewUrls,
  seriesAccess,
  title,
  titleKh,
  description,
  cast,
  genres,
  trailerUrl,
  episodes,
}: StepReviewCardProps) {
  const hasAnyArt = ARTWORK_ROLES_ORDER.some((r) => artworkByRole[r]);

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 4: Review</h3>
      <div className="space-y-6">
        {hasAnyArt && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Artwork</p>
            <div className="flex flex-wrap gap-4">
              {(["thumbnail-laptop", "cover-phone"] as ArtworkRole[]).map((role) => {
                const f = artworkByRole[role];
                const url = artworkPreviewUrls[role];
                if (!f || !url) return null;
                const widthClass = role === "cover-phone" ? "w-24" : "w-36";
                return (
                  <div key={role} className="max-w-[140px]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 leading-tight">
                      {MOVIE_ARTWORK_SLOTS[role].label}
                    </p>
                    <div
                      className={`rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 ${widthClass} ${MOVIE_ARTWORK_ASPECT_CLASS[role]}`}
                    >
                      <Image
                        src={url}
                        alt={MOVIE_ARTWORK_SLOTS[role].label}
                        width={role === "cover-phone" ? 96 : 144}
                        height={role === "cover-phone" ? 144 : 96}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Access</p>
          <p className="font-medium text-slate-900 dark:text-white">
            {seriesAccess === "membership" ? "Subscribers only" : "Free for all"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Series</p>
          <p className="font-medium text-slate-900 dark:text-white">{title || "-"}</p>
          {titleKh && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{titleKh}</p>}
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {description.slice(0, 100)}
              {description.length > 100 ? "..." : ""}
            </p>
          )}
        </div>
        {(genres.length > 0 || cast) && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Info</p>
            <p className="text-sm text-slate-900 dark:text-white">
              {[genres.length ? genres.join(" · ") : "", cast].filter(Boolean).join(" • ")}
            </p>
          </div>
        )}
        {trailerUrl.trim() ? (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trailer</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 break-all">{trailerUrl.trim()}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Episodes</p>
          <p className="font-medium text-slate-900 dark:text-white">
            {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
          </p>
          {seriesAccess === "membership" && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {episodes.filter((e) => e.isFreePreview).length} free preview
            </p>
          )}
          <div className="mt-2 space-y-1">
            {episodes.map((ep) => (
              <p key={ep.id} className="text-xs text-slate-500 dark:text-slate-400">
                EP{ep.episodeNumber} - {ep.title || `Episode ${ep.episodeNumber}`}
                {ep.videoFile ? ` · ${formatBytes(ep.videoFile.size)}` : ""}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
});
