"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CastInput } from "@/components/ui/CastInput";
import { Select } from "@/components/ui/Select";
import { toastError, toastSuccess } from "@/lib/toast";
import { GENRE_OPTIONS } from "@/lib/constants/genres";
import {
  uploadFileInParallel,
  formatBytes,
  formatSpeed,
  formatTime,
  type UploadProgress,
} from "@/lib/upload/parallel-uploader";
import { createLogger } from "@/lib/logger";
import { MAX_VIDEO_BYTES, MAX_IMAGE_BYTES } from "@/lib/r2/mime";
import type { EpisodeInput } from "@/types";

const log = createLogger("upload:series");

type SeriesAccess = "membership" | "free";

const STEPS = [
  { id: 1, title: "Access", description: "Membership or free" },
  { id: 2, title: "Details", description: "Series info" },
  { id: 3, title: "Episodes", description: "Add episodes" },
  { id: 4, title: "Review", description: "Confirm & upload" },
] as const;

export default function SeriesUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<UploadProgress | null>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadMetaRef = useRef<{
    movieId: string;
    multiparts: Array<{ uploadId: string; key: string }>;
  } | null>(null);

  // Step 1: Access
  const [seriesAccess, setSeriesAccess] = useState<SeriesAccess>("membership");

  // Step 2: Details
  const [title, setTitle] = useState("");
  const [titleKh, setTitleKh] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [cast, setCast] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false);
  const thumbnailRef = useRef<HTMLInputElement>(null);

  // Step 3: Episodes
  const [episodes, setEpisodes] = useState<EpisodeInput[]>([]);

  const addEpisode = () => {
    setEpisodes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        episodeNumber: prev.length + 1,
        title: "",
        videoFile: null,
        duration: "",
        isFreePreview: false,
      },
    ]);
  };

  const removeEpisode = (id: string) => {
    setEpisodes((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      return filtered.map((e, i) => ({ ...e, episodeNumber: i + 1 }));
    });
  };

  const updateEpisode = (id: string, updates: Partial<EpisodeInput>) => {
    setEpisodes((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const handleEpisodeFileChange = (id: string, file: File | null) => {
    updateEpisode(id, { videoFile: file });
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return !!title.trim() && !!thumbnailFile;
    if (step === 3) return episodes.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }
    if (!thumbnailFile) {
      toastError("Cover image is required.");
      return;
    }
    if (thumbnailFile.size > MAX_IMAGE_BYTES) {
      toastError(`Thumbnail is too large. Maximum is ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
      return;
    }
    const missingVideo = episodes.find((ep) => !ep.videoFile);
    if (missingVideo) {
      toastError(`Episode ${missingVideo.episodeNumber} needs a video file.`);
      return;
    }
    for (const ep of episodes) {
      if (ep.videoFile && ep.videoFile.size > MAX_VIDEO_BYTES) {
        toastError(`Episode ${ep.episodeNumber} video is too large (max ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB)`);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStats(null);
    setCurrentEpisodeIndex(0);
    abortControllerRef.current = new AbortController();

    try {
      const freeEpisodesCount =
        seriesAccess === "membership"
          ? episodes.filter((ep) => ep.isFreePreview).length
          : 0;

      log.info("Initializing series upload", { episodes: episodes.length });

      // ── Step 1: Initialize all multipart uploads at once ──────────────────
      const initRes = await fetch("/api/movies/series-multipart-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          title_kh: titleKh.trim() || null,
          description,
          genre,
          cast,
          releaseDate,
          duration: duration ? parseInt(duration, 10) : null,
          finalStatus: status,
          thumbnailType: thumbnailFile.type,
          thumbnailSize: thumbnailFile.size,
          freeEpisodesCount,
          totalEpisodes: episodes.length,
          episodes: episodes.map((ep) => ({
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            duration: ep.duration ? parseInt(ep.duration, 10) : null,
            isFreePreview: ep.isFreePreview ?? false,
            videoType: ep.videoFile!.type,
            videoSize: ep.videoFile!.size,
          })),
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error ?? "Failed to initialize upload");
      }

      const { movieId, thumbnail, episodes: episodeInits, finalStatus: confirmedStatus } = initData;
      log.info("Series upload initialized", { movieId });

      // Store for cleanup on failure
      uploadMetaRef.current = {
        movieId,
        multiparts: episodeInits.map(
          (ep: { uploadId: string; key: string }) => ({
            uploadId: ep.uploadId,
            key: ep.key,
          })
        ),
      };

      // ── Step 2a: Start thumbnail upload immediately (runs in parallel) ─────
      const thumbnailPromise = fetch(thumbnail.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": thumbnailFile.type },
        body: thumbnailFile,
      });

      // ── Step 2b: Upload each episode sequentially (parallel chunks within) ─
      const totalVideoBytes = episodes.reduce(
        (sum, ep) => sum + (ep.videoFile?.size ?? 0),
        0
      );
      let uploadedBeforeCurrentEpisode = 0;
      const completedEpisodes: Array<{
        episodeNumber: number;
        uploadId: string;
        key: string;
        parts: { ETag: string; PartNumber: number }[];
        title: string;
        duration: number | null;
        isFreePreview: boolean;
      }> = [];

      for (let i = 0; i < episodeInits.length; i++) {
        const epInit = episodeInits[i];
        const ep = episodes[i];
        setCurrentEpisodeIndex(i + 1);

        log.info(`Uploading episode ${i + 1}/${episodes.length}`, {
          size: formatBytes(ep.videoFile!.size),
          chunks: epInit.totalParts,
        });

        const epResult = await uploadFileInParallel({
          file: ep.videoFile!,
          partUrls: epInit.partUrls,
          partSize: epInit.partSize,
          concurrency: 8,
          abortSignal: abortControllerRef.current.signal,
          onProgress: (progress) => {
            // Overall progress: current episode's progress added to prior episodes
            const episodeOffset =
              (uploadedBeforeCurrentEpisode / totalVideoBytes) * 90;
            const episodeContribution =
              ((ep.videoFile!.size / totalVideoBytes) * 90 * progress.percentage) /
              100;
            setUploadProgress(Math.round(episodeOffset + episodeContribution));
            setUploadStats(progress);
          },
        });

        uploadedBeforeCurrentEpisode += ep.videoFile!.size;
        completedEpisodes.push({
          episodeNumber: epInit.episodeNumber,
          uploadId: epInit.uploadId,
          key: epInit.key,
          parts: epResult.parts,
          title: ep.title || `Episode ${epInit.episodeNumber}`,
          duration: ep.duration ? parseInt(ep.duration, 10) : null,
          isFreePreview: ep.isFreePreview ?? false,
        });

        log.info(`Episode ${i + 1} uploaded`, {
          time: `${epResult.totalTime.toFixed(1)}s`,
          speed: formatSpeed(epResult.averageSpeed),
        });
      }

      setUploadProgress(92);

      // ── Step 3: Await thumbnail ────────────────────────────────────────────
      const thumbRes = await thumbnailPromise;
      if (!thumbRes.ok) throw new Error("Thumbnail upload failed");
      setUploadProgress(95);

      // ── Step 4: Complete all multipart uploads and save to DB ─────────────
      log.info("Finalizing series upload");
      const completeRes = await fetch("/api/movies/series-multipart-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId,
          thumbnailKey: thumbnail.key,
          finalStatus: confirmedStatus,
          episodes: completedEpisodes,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok || !completeData.success) {
        throw new Error(completeData.error ?? "Failed to finalize upload");
      }

      setUploadProgress(100);
      toastSuccess("Series uploaded successfully!");
      router.push("/movies/series");
    } catch (err) {
      log.error("Series upload error", err);
      const errorMessage = err instanceof Error ? err.message : "Upload failed";

      if (uploadMetaRef.current) {
        fetch("/api/movies/series-multipart-complete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movieId: uploadMetaRef.current.movieId,
            multiparts: uploadMetaRef.current.multiparts,
          }),
        }).catch(() => {});
      }

      if (errorMessage.toLowerCase().includes("abort")) {
        toastError("Upload cancelled");
      } else {
        toastError(errorMessage);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStats(null);
      setCurrentEpisodeIndex(0);
      abortControllerRef.current = null;
      uploadMetaRef.current = null;
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-3">
        <Link href="/upload" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Series</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Step-by-step. Add episodes, set access.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === s.id
                  ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                  : step > s.id
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    : "text-slate-500 dark:text-slate-600"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= s.id ? "bg-red-500/30 text-red-600 dark:text-red-400" : "bg-slate-200 dark:bg-slate-700"}`}>
                {s.id}
              </span>
              {s.title}
            </button>
            {i < STEPS.length - 1 && (
              <svg className="w-4 h-4 text-slate-400 mx-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Access */}
        {step === 1 && (
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 1: Access</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">How will users watch this series?</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSeriesAccess("membership")}
                className={`flex-1 p-6 rounded-xl border-2 text-left transition-all ${
                  seriesAccess === "membership"
                    ? "border-red-500 bg-red-500/10 text-slate-900 dark:text-white"
                    : "border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="font-semibold block">Subscribers only</span>
                <span className="text-sm mt-1 block">Only users with an active subscription (any plan) can watch. Mark which episodes are free to preview in Step 3.</span>
              </button>
              <button
                type="button"
                onClick={() => setSeriesAccess("free")}
                className={`flex-1 p-6 rounded-xl border-2 text-left transition-all ${
                  seriesAccess === "free"
                    ? "border-red-500 bg-red-500/10 text-slate-900 dark:text-white"
                    : "border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="font-semibold block">Free for all</span>
                <span className="text-sm mt-1 block">No subscription needed. Everyone can watch all episodes.</span>
              </button>
            </div>
          </Card>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 2: Series Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Title (English)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Series title" required />
                <Input label="Title (Khmer)" value={titleKh} onChange={(e) => setTitleKh(e.target.value)} placeholder="ឈ្មោះស៊េរី" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cover image</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingThumbnail(true); }}
                  onDragLeave={() => setIsDraggingThumbnail(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingThumbnail(false);
                    const f = e.dataTransfer.files[0];
                    if (f?.type.startsWith("image/")) setThumbnailFile(f);
                  }}
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
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
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
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the series"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Genre" options={GENRE_OPTIONS} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Select genre" />
                <CastInput label="Cast" value={cast} onChange={setCast} placeholder="Actor name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Release Date" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
                <Input label="Duration (avg min/episode)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" />
              </div>
              <Select
                label="Status"
                options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]}
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              />
            </div>
          </Card>
        )}

        {/* Step 3: Episodes */}
        {step === 3 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Step 3: Episodes</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {seriesAccess === "membership"
                    ? 'Add each episode. Check "Free preview" for episodes users can watch without membership.'
                    : "Add each episode. All episodes are free to watch."}
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addEpisode}>
                + Add Episode
              </Button>
            </div>
            {episodes.length === 0 ? (
              <div
                onClick={addEpisode}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <svg className="w-12 h-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="mt-2 text-slate-600 dark:text-slate-500 font-medium">No episodes yet</p>
                <p className="text-sm text-slate-500 mt-1">Click to add your first episode</p>
              </div>
            ) : (
              <div className="space-y-4">
                {episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">Episode {ep.episodeNumber}</span>
                      <button type="button" onClick={() => removeEpisode(ep.id)} className="text-slate-500 hover:text-red-400 text-sm">
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Title" value={ep.title} onChange={(e) => updateEpisode(ep.id, { title: e.target.value })} placeholder={`Episode ${ep.episodeNumber}`} />
                      <Input label="Duration (min)" type="number" value={ep.duration} onChange={(e) => updateEpisode(ep.id, { duration: e.target.value })} placeholder="45" />
                    </div>
                    {seriesAccess === "membership" && (
                      <label className="mt-4 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ep.isFreePreview ?? false}
                          onChange={(e) => updateEpisode(ep.id, { isFreePreview: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/50"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Free preview (watchable without membership)</span>
                      </label>
                    )}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video File</label>
                      <label className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${ep.videoFile ? "border-emerald-500/50 bg-emerald-500/10" : "border-slate-300 dark:border-slate-600 hover:border-slate-400"}`}>
                        <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => handleEpisodeFileChange(ep.id, e.target.files?.[0] ?? null)} />
                        {ep.videoFile ? (
                          <span className="text-sm text-emerald-600 dark:text-emerald-400">{ep.videoFile.name} ({formatBytes(ep.videoFile.size)})</span>
                        ) : (
                          <span className="text-sm text-slate-500">Select video (MP4, WebM, MOV)</span>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 4: Review</h3>
            <div className="space-y-6">
              {thumbnailFile && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Cover image</p>
                  <div className="w-24 aspect-2/3 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img
                      src={URL.createObjectURL(thumbnailFile)}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Access</p>
                <p className="font-medium text-slate-900 dark:text-white">{seriesAccess === "membership" ? "Subscribers only" : "Free for all"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Series</p>
                <p className="font-medium text-slate-900 dark:text-white">{title || "—"}</p>
                {titleKh && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{titleKh}</p>}
                {description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description.slice(0, 100)}{description.length > 100 ? "…" : ""}</p>}
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
                      EP{ep.episodeNumber} — {ep.title || `Episode ${ep.episodeNumber}`}
                      {ep.videoFile ? ` · ${formatBytes(ep.videoFile.size)}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack} disabled={isUploading}>
              Back
            </Button>
          ) : (
            <Link href="/upload" className="inline-block">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          )}
          {step < 4 ? (
            <Button type="submit" disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button type="submit" isLoading={isUploading} disabled={isUploading}>
              Upload Series
            </Button>
          )}
        </div>
      </form>

      {/* ── Upload progress modal ──────────────────────────────────────────── */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal card */}
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

            {/* Animated top progress stripe */}
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-linear-to-r from-red-500 via-rose-400 to-red-600 transition-all duration-200 ease-linear"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            <div className="p-6 space-y-5">
              {/* Header */}
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
                    Uploading — {title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {uploadProgress < 90
                      ? currentEpisodeIndex > 0
                        ? `Episode ${currentEpisodeIndex} of ${episodes.length}…`
                        : "Preparing…"
                      : uploadProgress < 95
                        ? "Finalizing thumbnail…"
                        : uploadProgress < 100
                          ? "Saving to database…"
                          : "Complete!"}
                  </p>
                </div>
                <span className="shrink-0 text-2xl font-bold tabular-nums text-red-500">
                  {uploadProgress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-red-500 to-rose-500 transition-all duration-200 ease-linear"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>

              {/* Stats grid */}
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
                      {uploadStats.eta > 0 ? formatTime(uploadStats.eta) : "—"}
                    </p>
                  </div>
                </div>
              )}

              {/* Chunk + episode counter */}
              {uploadStats && (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                  Chunk {uploadStats.currentParts} / {uploadStats.totalParts} · 8 parallel connections
                </p>
              )}

              {/* Cancel */}
              <button
                type="button"
                onClick={handleCancelUpload}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Cancel Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
