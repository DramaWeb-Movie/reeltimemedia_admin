"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CastInput } from "@/components/ui/CastInput";
import { Select } from "@/components/ui/Select";
import { toastError, toastSuccess } from "@/lib/toast";
import { GENRE_OPTIONS } from "@/lib/constants/genres";

const STEPS = [
  { id: 1, title: "Info", description: "Title, cast" },
  { id: 2, title: "Media", description: "Video & pricing" },
  { id: 3, title: "Details", description: "Date, duration" },
  { id: 4, title: "Review", description: "Confirm & upload" },
] as const;

export default function SingleMovieUploadPage() {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step 1: Basic info + cast
  const [title, setTitle] = useState("");
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
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);

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
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("description", description);
      formData.set("genre", genre);
      formData.set("cast", cast);
      formData.set("price", price);
      formData.set("releaseDate", releaseDate);
      formData.set("duration", duration);
      formData.set("status", status);
      formData.set("trailerUrl", trailerUrl);
      formData.set("video", singleVideoFile);
      formData.set("thumbnail", thumbnailFile);
      if (subtitleFile) formData.set("subtitle", subtitleFile);

      const data = await new Promise<{ success?: boolean; error?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/movies/upload");

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && e.total > 0) {
            // Use browser's calculated total when available
            const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
            setUploadProgress(pct);
            console.log(`Upload progress: ${e.loaded} / ${e.total} bytes (${pct}%)`);
          } else {
            // Fallback: calculate based on video file size (main upload)
            const pct = Math.min(99, Math.round((e.loaded / singleVideoFile.size) * 100));
            setUploadProgress(pct);
            console.log(`Upload progress (estimated): ${e.loaded} bytes (${pct}%)`);
          }
        });

        xhr.addEventListener("load", () => {
          setUploadProgress(100);
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(json);
          } catch {
            resolve({ error: "Invalid response" });
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.send(formData);
      });

      if (!data.success) {
        toastError(data.error ?? "Failed to upload movie. Please try again.");
        return;
      }
      toastSuccess("Movie uploaded successfully");
      window.location.href = "/movies/single";
    } catch {
      toastError("Failed to upload movie. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Movie title" required />
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
              <Input label="Price (USD)" type="number" step="0.01" min="2" max="10" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2.99" hint="One-time purchase ($2–3 typical)" required />
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
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subtitle File (Optional)</label>
                <label className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${subtitleFile ? "border-emerald-500/50 bg-emerald-500/10" : "border-slate-300 dark:border-slate-600 hover:border-slate-400"}`}>
                  <input type="file" accept=".srt,.vtt,.ass" className="hidden" onChange={(e) => setSubtitleFile(e.target.files?.[0] ?? null)} />
                  {subtitleFile ? <span className="text-sm text-emerald-600 dark:text-emerald-400">{subtitleFile.name}</span> : <span className="text-sm text-slate-500">SRT, VTT, or ASS</span>}
                </label>
              </div>
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

        {isUploading && (
          <Card>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Uploading video...</span>
                <span className="font-medium text-slate-900 dark:text-white">{uploadProgress}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-200 ease-linear"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                Please wait while your video is being uploaded...
              </p>
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          {step > 1 ? <Button type="button" variant="outline" onClick={handleBack} disabled={isUploading}>Back</Button> : <Link href="/upload"><Button type="button" variant="outline" disabled={isUploading}>Cancel</Button></Link>}
          {step < 4 ? <Button type="submit" disabled={!canProceed()}>Next</Button> : <Button type="submit" isLoading={isUploading} disabled={isUploading}>Upload Movie</Button>}
        </div>
      </form>
    </div>
  );
}
