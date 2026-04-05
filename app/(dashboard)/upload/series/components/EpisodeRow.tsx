import { memo } from "react";
import { Input } from "@/components/ui/Input";
import { formatBytes } from "@/lib/upload/parallel-uploader";
import type { EpisodeInput } from "@/types";

type SeriesAccess = "membership" | "free";

type EpisodeRowProps = {
  ep: EpisodeInput;
  seriesAccess: SeriesAccess;
  onRemoveEpisode: (id: string) => void;
  onUpdateEpisode: (id: string, updates: Partial<EpisodeInput>) => void;
  onEpisodeFileChange: (id: string, file: File | null) => void;
};

export const EpisodeRow = memo(function EpisodeRow({
  ep,
  seriesAccess,
  onRemoveEpisode,
  onUpdateEpisode,
  onEpisodeFileChange,
}: EpisodeRowProps) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">Episode {ep.episodeNumber}</span>
        <button type="button" onClick={() => onRemoveEpisode(ep.id)} className="text-slate-500 hover:text-red-400 text-sm">
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Title"
          value={ep.title}
          onChange={(e) => onUpdateEpisode(ep.id, { title: e.target.value })}
          placeholder={`Episode ${ep.episodeNumber}`}
        />
        <Input
          label="Duration (min)"
          type="number"
          value={ep.duration}
          onChange={(e) => onUpdateEpisode(ep.id, { duration: e.target.value })}
          placeholder="45"
        />
      </div>
      {seriesAccess === "membership" && (
        <label className="mt-4 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={ep.isFreePreview ?? false}
            onChange={(e) => onUpdateEpisode(ep.id, { isFreePreview: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/50"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Free preview (watchable without membership)</span>
        </label>
      )}
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video File</label>
        <label className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${ep.videoFile ? "border-emerald-500/50 bg-emerald-500/10" : "border-slate-300 dark:border-slate-600 hover:border-slate-400"}`}>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => onEpisodeFileChange(ep.id, e.target.files?.[0] ?? null)}
          />
          {ep.videoFile ? (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">{ep.videoFile.name} ({formatBytes(ep.videoFile.size)})</span>
          ) : (
            <span className="text-sm text-slate-500">Select video (MP4, WebM, MOV)</span>
          )}
        </label>
      </div>
    </div>
  );
});
