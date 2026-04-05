import { memo } from "react";
import { CastInput } from "@/components/ui/CastInput";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GENRE_OPTIONS } from "@/lib/constants/genres";

type SeriesStatus = "draft" | "published";

type StepDetailsCardProps = {
  title: string;
  onTitleChange: (value: string) => void;
  titleKh: string;
  onTitleKhChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  genre: string;
  onGenreChange: (value: string) => void;
  cast: string;
  onCastChange: (value: string) => void;
  releaseDate: string;
  onReleaseDateChange: (value: string) => void;
  duration: string;
  onDurationChange: (value: string) => void;
  status: SeriesStatus;
  onStatusChange: (value: SeriesStatus) => void;
  thumbnailFile: File | null;
  isDraggingThumbnail: boolean;
  thumbnailRef: React.RefObject<HTMLInputElement | null>;
  onThumbnailDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onThumbnailDragLeave: () => void;
  onThumbnailDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onThumbnailFileChange: (file: File | null) => void;
};

export const StepDetailsCard = memo(function StepDetailsCard({
  title,
  onTitleChange,
  titleKh,
  onTitleKhChange,
  description,
  onDescriptionChange,
  genre,
  onGenreChange,
  cast,
  onCastChange,
  releaseDate,
  onReleaseDateChange,
  duration,
  onDurationChange,
  status,
  onStatusChange,
  thumbnailFile,
  isDraggingThumbnail,
  thumbnailRef,
  onThumbnailDragOver,
  onThumbnailDragLeave,
  onThumbnailDrop,
  onThumbnailFileChange,
}: StepDetailsCardProps) {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 2: Series Details</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Title (English)" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Series title" required />
          <Input label="Title (Khmer)" value={titleKh} onChange={(e) => onTitleKhChange(e.target.value)} placeholder="ឈ្មោះស៊េរី" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cover image</label>
          <div
            onDragOver={onThumbnailDragOver}
            onDragLeave={onThumbnailDragLeave}
            onDrop={onThumbnailDrop}
            onClick={() => thumbnailRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              thumbnailFile ? "border-emerald-500/50 bg-emerald-500/10" : isDraggingThumbnail ? "border-red-500 bg-red-500/10" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
            }`}
          >
            <input
              ref={thumbnailRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onThumbnailFileChange(e.target.files?.[0] ?? null)}
            />
            {thumbnailFile ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{thumbnailFile.name}</p>
            ) : (
              <>
                <svg className="w-10 h-10 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drop cover image or click (JPG, PNG, WebP)</p>
              </>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Brief description of the series"
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Genre" options={GENRE_OPTIONS} value={genre} onChange={(e) => onGenreChange(e.target.value)} placeholder="Select genre" />
          <CastInput label="Cast" value={cast} onChange={onCastChange} placeholder="Actor name" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Release Date" type="date" value={releaseDate} onChange={(e) => onReleaseDateChange(e.target.value)} />
          <Input label="Duration (avg min/episode)" type="number" value={duration} onChange={(e) => onDurationChange(e.target.value)} placeholder="45" />
        </div>
        <Select
          label="Status"
          options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as SeriesStatus)}
        />
      </div>
    </Card>
  );
});
