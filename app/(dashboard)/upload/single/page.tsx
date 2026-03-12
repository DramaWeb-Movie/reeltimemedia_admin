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

const log = createLogger("upload:single");

const STEPS = [
  { id: 1, title: "Info", description: "Title, cast" },
  { id: 2, title: "Media", description: "Video & pricing" },
  { id: 3, title: "Details", description: "Date, duration" },
  { id: 4, title: "Review", description: "Confirm & upload" },
] as const;

export default function SingleMovieUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<UploadProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Tracks active upload metadata so the catch block can clean up R2 + DB on any failure
  const uploadMetaRef = useRef<{ movieId: string; uploadId: string; key: string } | null>(null);

  // Step 1: Basic info + cast
  const [title, setTitle] = useState("");
  const [titleKh, setTitleKh] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [cast, setCast] = useState("");

  // Step 2: Media
  const [price, setPrice] = useState("2.99");
  const [singleVideoFile, setSingleVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false);
  const singleVideoRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLInputElement>(null);

  // Step 3: Details
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [trailerUrl, setTrailerUrl] = useState("");

  const canProceed = () => {
    if (step === 1) return !!title.trim();
    if (step === 2) return !!singleVideoFile && !!thumbnailFile;
    return true;
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }
    if (!singleVideoFile || !thumbnailFile) {
      toastError("Video and thumbnail are required");
      return;
    }
    if (singleVideoFile.size > MAX_VIDEO_BYTES) {
      toastError(`Video is too large. Maximum size is ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB`);
      return;
    }
    if (thumbnailFile.size > MAX_IMAGE_BYTES) {
      toastError(`Thumbnail is too large. Maximum size is ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStats(null);
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Initialize multipart upload (get presigned URLs for all chunks)
      log.info(`Initializing parallel upload`, { size: formatBytes(singleVideoFile.size) });
      const initRes = await fetch("/api/movies/multipart-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          title_kh: titleKh.trim() || null,
          description,
          genre,
          cast,
          price: price ? parseFloat(price) : null,
          releaseDate,
          duration: duration ? parseInt(duration, 10) : null,
          finalStatus: status,
          trailerUrl,
          videoType: singleVideoFile.type,
          videoSize: singleVideoFile.size,
          thumbnailType: thumbnailFile.type,
          thumbnailSize: thumbnailFile.size,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error ?? "Failed to initialize upload");
      }

      const { movieId, video, thumbnail, finalStatus: confirmedStatus } = initData;
      log.info("Upload initialized", { movieId, chunks: video.totalParts });

      // Store so the catch block can abort R2 + delete DB record if anything fails
      uploadMetaRef.current = { movieId, uploadId: video.uploadId, key: video.key };

      // Step 2a: Kick off thumbnail upload immediately — runs in parallel with the video
      const thumbnailPromise = fetch(thumbnail.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": thumbnailFile.type },
        body: thumbnailFile,
      });

      // Step 2b: Upload video chunks in parallel
      log.info("Starting parallel upload", { concurrency: 8 });
      const uploadResult = await uploadFileInParallel({
        file: singleVideoFile,
        partUrls: video.partUrls,
        partSize: video.partSize,
        concurrency: 8,
        abortSignal: abortControllerRef.current.signal,
        onProgress: (progress) => {
          setUploadProgress(Math.round(progress.percentage * 0.9)); // 90% for video
          setUploadStats(progress);
        },
        onPartComplete: (part) => {
          log.debug(`Chunk complete`, { part: part.PartNumber, of: video.totalParts });
        },
      });

      log.info("Video upload complete", {
        time: `${uploadResult.totalTime.toFixed(1)}s`,
        speed: formatSpeed(uploadResult.averageSpeed),
      });
      setUploadProgress(92);

      // Step 3: Await thumbnail (almost certainly already done)
      const thumbRes = await thumbnailPromise;
      if (!thumbRes.ok) {
        throw new Error("Thumbnail upload failed");
      }
      setUploadProgress(95);

      setUploadProgress(97);

      // Step 4: Complete multipart upload and save to database
      log.info("Finalizing upload");
      const completeRes = await fetch("/api/movies/multipart-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId,
          uploadId: video.uploadId,
          key: video.key,
          thumbnailKey: thumbnail.key,
          parts: uploadResult.parts,
          finalStatus: confirmedStatus,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok || !completeData.success) {
        throw new Error(completeData.error ?? "Failed to finalize upload");
      }

      setUploadProgress(100);
      toastSuccess(`Movie uploaded in ${uploadResult.totalTime.toFixed(0)}s!`);
      router.push("/movies/single");
    } catch (err) {
      log.error("Upload error", err);
      const errorMessage = err instanceof Error ? err.message : "Upload failed";

      // Best-effort cleanup: abort the R2 multipart upload and delete the
      // orphaned "uploading" movie record so no garbage is left behind.
      if (uploadMetaRef.current) {
        fetch("/api/movies/multipart-complete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movieId: uploadMetaRef.current.movieId,
            uploadId: uploadMetaRef.current.uploadId,
            key: uploadMetaRef.current.key,
          }),
        }).catch(() => {});
      }

      if (errorMessage.includes("abort")) {
        toastError("Upload cancelled");
      } else if (errorMessage.includes("network") || errorMessage.includes("CORS")) {
        toastError("Network error. Make sure CORS is configured on your R2 bucket.");
      } else {
        toastError(errorMessage);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStats(null);
      abortControllerRef.current = null;
      uploadMetaRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Single Movie</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Step-by-step. One video, one price.</p>
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
        {/* Step 1: Basic Info + Cast */}
        {step === 1 && (
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 1: Basic Info</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Title (English)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Movie title" required />
                <Input label="Title (Khmer)" value={titleKh} onChange={(e) => setTitleKh(e.target.value)} placeholder="ឈ្មោះភាពយន្ត" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the movie"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Genre" options={GENRE_OPTIONS} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Select genre" />
                <CastInput label="Cast" value={cast} onChange={setCast} placeholder="Actor name" />
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Video, Thumbnail, Pricing */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 2: Video & Thumbnail</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video File (MP4, WebM)</p>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingVideo(true); }}
                    onDragLeave={() => setIsDraggingVideo(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDraggingVideo(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("video/")) setSingleVideoFile(f); }}
                    onClick={() => singleVideoRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${singleVideoFile ? "border-emerald-500/50 bg-emerald-500/10" : isDraggingVideo ? "border-red-500 bg-red-500/10" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"}`}
                  >
                    <input ref={singleVideoRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => setSingleVideoFile(e.target.files?.[0] ?? null)} />
                    {singleVideoFile ? <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{singleVideoFile.name}</p> : <><svg className="w-10 h-10 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drop video or click</p></>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Thumbnail (JPG, PNG)</p>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingThumbnail(true); }}
                    onDragLeave={() => setIsDraggingThumbnail(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDraggingThumbnail(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) setThumbnailFile(f); }}
                    onClick={() => thumbnailRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${thumbnailFile ? "border-emerald-500/50 bg-emerald-500/10" : isDraggingThumbnail ? "border-red-500 bg-red-500/10" : "border-slate-300 dark:border-slate-700 hover:border-slate-400"}`}
                  >
                    <input ref={thumbnailRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)} />
                    {thumbnailFile ? <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{thumbnailFile.name}</p> : <><svg className="w-10 h-10 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drop image or click</p></>}
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Pricing</h3>
              <Input label="Price (USD)" type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2.99" hint="One-time purchase price" required />
            </Card>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 3: Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Release Date" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
                <Input label="Duration (minutes)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="120" />
              </div>
              <Select label="Status" options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]} value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} />
              <Input label="Trailer URL" type="url" value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} placeholder="https://youtube.com/..." hint="Optional" />
            </div>
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 4: Review</h3>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Movie</p>
                <p className="font-medium text-slate-900 dark:text-white">{title || "—"}</p>
                {titleKh && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{titleKh}</p>}
                {description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description.slice(0, 100)}...</p>}
              </div>
              {cast && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cast</p>
                  <p className="text-sm text-slate-900 dark:text-white">{cast}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Price</p>
                <p className="font-medium text-slate-900 dark:text-white">${price}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          {step > 1 ? <Button type="button" variant="outline" onClick={handleBack} disabled={isUploading}>Back</Button> : <Link href="/upload"><Button type="button" variant="outline" disabled={isUploading}>Cancel</Button></Link>}
          {step < 4 ? <Button type="submit" disabled={!canProceed()}>Next</Button> : <Button type="submit" isLoading={isUploading} disabled={isUploading}>Upload Movie</Button>}
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
                {/* Pulsing upload icon */}
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
                    {uploadProgress < 92
                      ? "Transferring video chunks…"
                      : uploadProgress < 95
                        ? "Finalizing thumbnail…"
                        : uploadProgress < 97
                          ? "Uploading subtitles…"
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

              {/* Chunk counter */}
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
