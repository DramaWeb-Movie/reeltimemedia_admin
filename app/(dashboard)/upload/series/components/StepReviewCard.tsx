import { memo } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { formatBytes } from "@/lib/upload/parallel-uploader";
import type { EpisodeInput } from "@/types";

type SeriesAccess = "membership" | "free";

type StepReviewCardProps = {
  thumbnailFile: File | null;
  thumbnailPreviewUrl: string | null;
  seriesAccess: SeriesAccess;
  title: string;
  titleKh: string;
  description: string;
  cast: string;
  genre: string;
  episodes: EpisodeInput[];
};

export const StepReviewCard = memo(function StepReviewCard({
  thumbnailFile,
  thumbnailPreviewUrl,
  seriesAccess,
  title,
  titleKh,
  description,
  cast,
  genre,
  episodes,
}: StepReviewCardProps) {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 4: Review</h3>
      <div className="space-y-6">
        {thumbnailFile && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Cover image</p>
            <div className="w-24 aspect-2/3 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
              <Image src={thumbnailPreviewUrl ?? ""} alt="Cover" width={96} height={144} unoptimized className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Access</p>
          <p className="font-medium text-slate-900 dark:text-white">{seriesAccess === "membership" ? "Subscribers only" : "Free for all"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Series</p>
          <p className="font-medium text-slate-900 dark:text-white">{title || "-"}</p>
          {titleKh && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{titleKh}</p>}
          {description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description.slice(0, 100)}{description.length > 100 ? "..." : ""}</p>}
        </div>
        {(cast || genre) && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Info</p>
            <p className="text-sm text-slate-900 dark:text-white">{[genre, cast].filter(Boolean).join(" • ")}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Episodes</p>
          <p className="font-medium text-slate-900 dark:text-white">{episodes.length} episode{episodes.length !== 1 ? "s" : ""}</p>
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
