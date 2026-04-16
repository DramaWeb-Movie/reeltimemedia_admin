"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  uploadFileInParallel,
  formatBytes,
  formatSpeed,
  type UploadProgress,
} from "@/lib/upload/parallel-uploader";
import { createLogger } from "@/lib/logger";
import { MAX_VIDEO_BYTES, MAX_IMAGE_BYTES } from "@/lib/r2/mime";
import { serializeGenresToDb } from "@/lib/genre-utils";
import type { ArtworkRole } from "@/lib/constants/movie-artwork";
import { ARTWORK_ROLES_ORDER } from "@/lib/constants/movie-artwork";
import type { EpisodeInput } from "@/types";
import { EpisodeRow } from "./components/EpisodeRow";
import { StepAccessCard } from "./components/StepAccessCard";
import { StepDetailsCard } from "./components/StepDetailsCard";
import { StepIndicator } from "./components/StepIndicator";
import { StepReviewCard } from "./components/StepReviewCard";
import { UploadProgressModal } from "./components/UploadProgressModal";

const log = createLogger("upload:series");

type SeriesAccess = "membership" | "free";
type SeriesStatus = "draft" | "published";

const PROGRESS_UPDATE_INTERVAL_MS = 120;

function releaseYearToDate(value: string): string | null {
  const year = value.trim();
  if (!year) return null;
  if (!/^\d{4}$/.test(year)) return null;
  return `${year}-01-01`;
}

function emptyArtwork(): Record<ArtworkRole, File | null> {
  return {
    "thumbnail-phone": null,
    "thumbnail-laptop": null,
    "cover-phone": null,
    "cover-laptop": null,
  };
}

function getAdaptiveUploadConcurrency(): number {
  if (typeof navigator === "undefined") return 8;

  const effectiveType = (
    navigator as Navigator & { connection?: { effectiveType?: string } }
  ).connection?.effectiveType;

  switch (effectiveType) {
    case "slow-2g":
    case "2g":
      return 2;
    case "3g":
      return 4;
    default:
      return 8;
  }
}

export default function SeriesUploadPage() {
  const router = useRouter();
  const uploadConcurrency = useMemo(() => getAdaptiveUploadConcurrency(), []);
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<UploadProgress | null>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProgressUpdateRef = useRef(0);
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
  const [genres, setGenres] = useState<string[]>([]);
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<SeriesStatus>("draft");
  const [cast, setCast] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [isPromotionHero, setIsPromotionHero] = useState(false);
  const [artworkByRole, setArtworkByRole] = useState<Record<ArtworkRole, File | null>>(emptyArtwork);
  const thumbnailArtworkFile = artworkByRole["thumbnail-laptop"] ?? artworkByRole["thumbnail-phone"];
  const coverArtworkFile = artworkByRole["cover-phone"] ?? artworkByRole["cover-laptop"];

  const artworkPreviewUrls = useMemo(() => {
    const next: Record<ArtworkRole, string | null> = {
      "thumbnail-phone": null,
      "thumbnail-laptop": null,
      "cover-phone": null,
      "cover-laptop": null,
    };
    for (const role of ARTWORK_ROLES_ORDER) {
      const f = artworkByRole[role];
      if (f) next[role] = URL.createObjectURL(f);
    }
    return next;
  }, [
    artworkByRole["thumbnail-phone"],
    artworkByRole["thumbnail-laptop"],
    artworkByRole["cover-phone"],
    artworkByRole["cover-laptop"],
  ]);

  useEffect(() => {
    return () => {
      for (const role of ARTWORK_ROLES_ORDER) {
        const u = artworkPreviewUrls[role];
        if (u) URL.revokeObjectURL(u);
      }
    };
  }, [artworkPreviewUrls]);

  // Step 3: Episodes
  const [episodes, setEpisodes] = useState<EpisodeInput[]>([]);

  const addEpisode = useCallback(() => {
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
  }, []);

  const removeEpisode = useCallback((id: string) => {
    setEpisodes((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      return filtered.map((e, i) => ({ ...e, episodeNumber: i + 1 }));
    });
  }, []);

  const updateEpisode = useCallback((id: string, updates: Partial<EpisodeInput>) => {
    setEpisodes((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const handleEpisodeFileChange = useCallback((id: string, file: File | null) => {
    updateEpisode(id, { videoFile: file });
  }, [updateEpisode]);

  const handleArtworkChange = useCallback((role: ArtworkRole, file: File | null) => {
    if (role.startsWith("thumbnail")) {
      setArtworkByRole((prev) => ({
        ...prev,
        "thumbnail-phone": file,
        "thumbnail-laptop": file,
      }));
      return;
    }
    setArtworkByRole((prev) => ({
      ...prev,
      "cover-phone": file,
      "cover-laptop": file,
    }));
  }, []);

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) {
      return !!title.trim() && !!thumbnailArtworkFile && !!coverArtworkFile;
    }
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
    if (!thumbnailArtworkFile || !coverArtworkFile) {
      toastError("Thumbnail and movie cover are required.");
      return;
    }
    for (const file of [thumbnailArtworkFile, coverArtworkFile]) {
      if (file.size > MAX_IMAGE_BYTES) {
        toastError(`Each image must be at most ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
        return;
      }
    }

    let missingVideoEpisodeNumber: number | null = null;
    let emptyVideoEpisodeNumber: number | null = null;
    let oversizedVideoEpisodeNumber: number | null = null;

    for (const ep of episodes) {
      const videoFile = ep.videoFile;
      if (!videoFile) {
        missingVideoEpisodeNumber = ep.episodeNumber;
        break;
      }

      if (videoFile.size <= 0) {
        emptyVideoEpisodeNumber = ep.episodeNumber;
        break;
      }

      if (videoFile.size > MAX_VIDEO_BYTES) {
        oversizedVideoEpisodeNumber = ep.episodeNumber;
        break;
      }
    }

    if (missingVideoEpisodeNumber !== null) {
      toastError(`Episode ${missingVideoEpisodeNumber} needs a video file.`);
      return;
    }

    if (emptyVideoEpisodeNumber !== null) {
      toastError(`Episode ${emptyVideoEpisodeNumber} has an invalid empty video file.`);
      return;
    }

    if (oversizedVideoEpisodeNumber !== null) {
      toastError(`Episode ${oversizedVideoEpisodeNumber} video is too large (max ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB)`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStats(null);
    setCurrentEpisodeIndex(0);
    abortControllerRef.current = new AbortController();
    lastProgressUpdateRef.current = 0;

    try {
      const abortSignal = abortControllerRef.current.signal;
      const freeEpisodesCount =
        seriesAccess === "membership"
          ? episodes.filter((ep) => ep.isFreePreview).length
          : 0;

      log.info("Initializing series upload", { episodes: episodes.length });

      // ── Step 1: Initialize all multipart uploads at once ──────────────────
      const initRes = await fetch("/api/movies/series-multipart-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortSignal,
        body: JSON.stringify({
          title: title.trim(),
          title_kh: titleKh.trim() || null,
          description,
          genre: serializeGenresToDb(genres),
          cast,
          releaseDate: releaseYearToDate(releaseDate),
          duration: duration ? parseInt(duration, 10) : null,
          trailerUrl: trailerUrl.trim() || null,
          isPromotionHero,
          finalStatus: status,
          thumbnailPhoneType: thumbnailArtworkFile.type,
          thumbnailPhoneSize: thumbnailArtworkFile.size,
          thumbnailLaptopType: thumbnailArtworkFile.type,
          thumbnailLaptopSize: thumbnailArtworkFile.size,
          coverPhoneType: coverArtworkFile.type,
          coverPhoneSize: coverArtworkFile.size,
          coverLaptopType: coverArtworkFile.type,
          coverLaptopSize: coverArtworkFile.size,
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

      const {
        movieId,
        thumbnailPhone,
        thumbnailLaptop,
        coverPhone,
        coverLaptop,
        episodes: episodeInits,
        finalStatus: confirmedStatus,
      } = initData;
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

      const putArt = (url: string, f: File) =>
        fetch(url, { method: "PUT", headers: { "Content-Type": f.type }, signal: abortSignal, body: f });

      const imagePromises = Promise.all([
        putArt(thumbnailPhone.uploadUrl, thumbnailArtworkFile),
        putArt(thumbnailLaptop.uploadUrl, thumbnailArtworkFile),
        putArt(coverPhone.uploadUrl, coverArtworkFile),
        putArt(coverLaptop.uploadUrl, coverArtworkFile),
      ]);

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
          concurrency: uploadConcurrency,
          abortSignal: abortControllerRef.current.signal,
          onProgress: (progress) => {
              const now = Date.now();
              const shouldUpdate =
                now - lastProgressUpdateRef.current >= PROGRESS_UPDATE_INTERVAL_MS ||
                progress.percentage >= 100;
              if (!shouldUpdate) return;

              lastProgressUpdateRef.current = now;

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

      const imageResponses = await imagePromises;
      if (imageResponses.some((r) => !r.ok)) {
        throw new Error("One or more artwork uploads failed");
      }
      setUploadProgress(95);

      // ── Step 4: Complete all multipart uploads and save to DB ─────────────
      log.info("Finalizing series upload");
      const completeRes = await fetch("/api/movies/series-multipart-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortSignal,
        body: JSON.stringify({
          movieId,
          thumbnailPhoneKey: thumbnailPhone.key,
          thumbnailLaptopKey: thumbnailLaptop.key,
          coverPhoneKey: coverPhone.key,
          coverLaptopKey: coverLaptop.key,
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
          keepalive: true,
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

      <StepIndicator step={step} onStepChange={setStep} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <StepAccessCard
            seriesAccess={seriesAccess}
            onSeriesAccessChange={setSeriesAccess}
          />
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <StepDetailsCard
              title={title}
              onTitleChange={setTitle}
              titleKh={titleKh}
              onTitleKhChange={setTitleKh}
              description={description}
              onDescriptionChange={setDescription}
              genres={genres}
              onGenresChange={setGenres}
              cast={cast}
              onCastChange={setCast}
              releaseDate={releaseDate}
              onReleaseDateChange={setReleaseDate}
              duration={duration}
              onDurationChange={setDuration}
              status={status}
              onStatusChange={setStatus}
              trailerUrl={trailerUrl}
              onTrailerUrlChange={setTrailerUrl}
              artworkByRole={artworkByRole}
              onArtworkChange={handleArtworkChange}
            />
            <Card>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                <input
                  type="checkbox"
                  checked={isPromotionHero}
                  onChange={(e) => setIsPromotionHero(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Show this series in promotion hero section
                </span>
              </label>
            </Card>
          </div>
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
                  <EpisodeRow
                    key={ep.id}
                    ep={ep}
                    seriesAccess={seriesAccess}
                    onRemoveEpisode={removeEpisode}
                    onUpdateEpisode={updateEpisode}
                    onEpisodeFileChange={handleEpisodeFileChange}
                  />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <StepReviewCard
            artworkByRole={artworkByRole}
            artworkPreviewUrls={artworkPreviewUrls}
            seriesAccess={seriesAccess}
            title={title}
            titleKh={titleKh}
            description={description}
            cast={cast}
            genres={genres}
            trailerUrl={trailerUrl}
            episodes={episodes}
          />
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

      <UploadProgressModal
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        title={title}
        currentEpisodeIndex={currentEpisodeIndex}
        episodesLength={episodes.length}
        uploadStats={uploadStats}
        uploadConcurrency={uploadConcurrency}
        onCancelUpload={handleCancelUpload}
      />
    </div>
  );
}
