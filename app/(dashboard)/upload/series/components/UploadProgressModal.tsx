import { memo } from "react";
import {
  formatBytes,
  formatSpeed,
  formatTime,
  type UploadProgress,
} from "@/lib/upload/parallel-uploader";

type UploadProgressModalProps = {
  isUploading: boolean;
  uploadProgress: number;
  title: string;
  currentEpisodeIndex: number;
  episodesLength: number;
  uploadStats: UploadProgress | null;
  uploadConcurrency: number;
  onCancelUpload: () => void;
};

export const UploadProgressModal = memo(function UploadProgressModal({
  isUploading,
  uploadProgress,
  title,
  currentEpisodeIndex,
  episodesLength,
  uploadStats,
  uploadConcurrency,
  onCancelUpload,
}: UploadProgressModalProps) {
  if (!isUploading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-linear-to-r from-red-500 via-rose-400 to-red-600 transition-all duration-200 ease-linear"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-500 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                Uploading - {title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {uploadProgress < 90
                  ? currentEpisodeIndex > 0
                    ? `Episode ${currentEpisodeIndex} of ${episodesLength}...`
                    : "Preparing..."
                  : uploadProgress < 95
                    ? "Finalizing thumbnail..."
                    : uploadProgress < 100
                      ? "Saving to database..."
                      : "Complete!"}
              </p>
            </div>
            <span className="shrink-0 text-2xl font-bold tabular-nums text-red-500">
              {uploadProgress}%
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-red-500 to-rose-500 transition-all duration-200 ease-linear"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>

          {uploadStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Speed</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatSpeed(uploadStats.speed)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Done</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatBytes(uploadStats.uploadedBytes)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                  / {formatBytes(uploadStats.totalBytes)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ETA</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                  {uploadStats.eta > 0 ? formatTime(uploadStats.eta) : "-"}
                </p>
              </div>
            </div>
          )}

          {uploadStats && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              Chunk {uploadStats.currentParts} / {uploadStats.totalParts} - {uploadConcurrency} parallel connections
            </p>
          )}

          <button
            type="button"
            onClick={onCancelUpload}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            Cancel Upload
          </button>
        </div>
      </div>
    </div>
  );
});
