import { memo } from "react";
import { CastInput } from "@/components/ui/CastInput";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GenreMultiSelect } from "@/components/ui/GenreMultiSelect";
import type { ArtworkRole } from "@/lib/constants/movie-artwork";
import { ArtworkDropSlot } from "@/components/upload/ArtworkDropSlot";

type SeriesStatus = "draft" | "published";

type StepDetailsCardProps = {
  title: string;
  onTitleChange: (value: string) => void;
  titleKh: string;
  onTitleKhChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  genres: string[];
  onGenresChange: (value: string[]) => void;
  cast: string;
  onCastChange: (value: string) => void;
  releaseDate: string;
  onReleaseDateChange: (value: string) => void;
  duration: string;
  onDurationChange: (value: string) => void;
  status: SeriesStatus;
  onStatusChange: (value: SeriesStatus) => void;
  trailerUrl: string;
  onTrailerUrlChange: (value: string) => void;
  artworkByRole: Record<ArtworkRole, File | null>;
  onArtworkChange: (role: ArtworkRole, file: File | null) => void;
};

export const StepDetailsCard = memo(function StepDetailsCard({
  title,
  onTitleChange,
  titleKh,
  onTitleKhChange,
  description,
  onDescriptionChange,
  genres,
  onGenresChange,
  cast,
  onCastChange,
  releaseDate,
  onReleaseDateChange,
  duration,
  onDurationChange,
  status,
  onStatusChange,
  trailerUrl,
  onTrailerUrlChange,
  artworkByRole,
  onArtworkChange,
}: StepDetailsCardProps) {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 2: Series Details</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Title (English)"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Series title"
            required
          />
          <Input
            label="Title (Khmer)"
            value={titleKh}
            onChange={(e) => onTitleKhChange(e.target.value)}
            placeholder="ឈ្មោះស៊េរី"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Artwork (two images)</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Upload one movie thumbnail and one movie cover.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ArtworkDropSlot
              role="thumbnail-laptop"
              label="Movie thumbnail"
              description="Main thumbnail image for this series."
              file={artworkByRole["thumbnail-laptop"] ?? artworkByRole["thumbnail-phone"]}
              onChange={(f) => onArtworkChange("thumbnail-laptop", f)}
            />
            <ArtworkDropSlot
              role="cover-phone"
              label="Movie cover"
              description="Main cover image for this series."
              file={artworkByRole["cover-phone"] ?? artworkByRole["cover-laptop"]}
              onChange={(f) => onArtworkChange("cover-phone", f)}
            />
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
        <GenreMultiSelect
          value={genres}
          onChange={onGenresChange}
          hint="Pick from the list and/or add your own below."
        />
        <CastInput label="Cast" value={cast} onChange={onCastChange} placeholder="Actor name" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Release Year"
            type="number"
            min="1900"
            max="2100"
            step="1"
            value={releaseDate}
            onChange={(e) => onReleaseDateChange(e.target.value)}
            placeholder="2024"
          />
          <Input
            label="Duration (avg min/episode)"
            type="number"
            value={duration}
            onChange={(e) => onDurationChange(e.target.value)}
            placeholder="45"
          />
        </div>
        <Select
          label="Status"
          options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as SeriesStatus)}
        />
        <Input
          label="Trailer URL"
          type="url"
          value={trailerUrl}
          onChange={(e) => onTrailerUrlChange(e.target.value)}
          placeholder="https://youtube.com/..."
          hint="Optional — YouTube or direct video link"
        />
      </div>
    </Card>
  );
});
