"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CastInput } from "@/components/ui/CastInput";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import { SinglePricingSection } from "@/components/movies/edit/SinglePricingSection";
import { SeriesAccessSection } from "@/components/movies/edit/SeriesAccessSection";
import { SeriesEpisodesPanel } from "@/components/movies/edit/SeriesEpisodesPanel";
import { parseGenresFromDb, serializeGenresToDb } from "@/lib/genre-utils";
import { GenreMultiSelect } from "@/components/ui/GenreMultiSelect";
import { ArtworkDropSlot } from "@/components/upload/ArtworkDropSlot";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  uploadFileInParallel,
  formatBytes,
  formatSpeed,
  formatTime,
  type UploadProgress,
} from "@/lib/upload/parallel-uploader";
import { MAX_VIDEO_BYTES, MAX_IMAGE_BYTES } from "@/lib/r2/mime";
import type { ArtworkRole } from "@/lib/constants/movie-artwork";
import { ARTWORK_ROLES_ORDER, MOVIE_ARTWORK_SLOTS, MOVIE_ARTWORK_ASPECT_CLASS } from "@/lib/constants/movie-artwork";
import type { SeriesEpisode } from "@/components/movies/edit/types";
import type { Movie } from "@/types";
import type { SubscriptionPlan } from "@/types";

function emptyArtwork(): Record<ArtworkRole, File | null> {
  return {
    "thumbnail-phone": null,
    "thumbnail-laptop": null,
    "cover-phone": null,
    "cover-laptop": null,
  };
}

export default function EditMoviePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [titleKh, setTitleKh] = useState("");
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [cast, setCast] = useState("");
  const [price, setPrice] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<Movie["status"]>("draft");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [isPromotionHero, setIsPromotionHero] = useState(false);
  const [freeEpisodesCount, setFreeEpisodesCount] = useState("");
  const [totalEpisodes, setTotalEpisodes] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");

  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<SeriesEpisode | null>(null);
  const [editEpisodeTitle, setEditEpisodeTitle] = useState("");
  const [editEpisodeDuration, setEditEpisodeDuration] = useState("");
  const [editEpisodeFree, setEditEpisodeFree] = useState(false);
  const [editEpisodeVideo, setEditEpisodeVideo] = useState<File | null>(null);
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null);
  const [deleteConfirmEpisode, setDeleteConfirmEpisode] = useState<SeriesEpisode | null>(null);
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [addEpisodeTitle, setAddEpisodeTitle] = useState("");
  const [addEpisodeDuration, setAddEpisodeDuration] = useState("");
  const [addEpisodeFree, setAddEpisodeFree] = useState(false);
  const [addEpisodeVideo, setAddEpisodeVideo] = useState<File | null>(null);
  const [addingEpisode, setAddingEpisode] = useState(false);

  // Artwork replacement
  const [artworkByRole, setArtworkByRole] = useState<Record<ArtworkRole, File | null>>(emptyArtwork);

  // Video replacement (single movies only)
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [isReplacingVideo, setIsReplacingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadStats, setVideoUploadStats] = useState<UploadProgress | null>(null);
  const videoAbortRef = useRef<AbortController | null>(null);
  const videoMetaRef = useRef<{ uploadId: string; key: string } | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const loadEpisodes = useCallback(() => {
    if (movie?.type !== "series") return;
    setEpisodesLoading(true);
    fetch(`/api/movies/${id}/episodes`)
      .then((r) => (r.ok ? r.json() : { episodes: [] }))
      .then((d) => setEpisodes(d.episodes ?? []))
      .catch(() => setEpisodes([]))
      .finally(() => setEpisodesLoading(false));
  }, [id, movie?.type]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/movies/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/plans").then((r) => (r.ok ? r.json() : { plans: [] })),
    ])
      .then(([movieRes, plansRes]) => {
        const m = movieRes?.movie ?? null;
        setMovie(m);
        setPlans(plansRes?.plans ?? []);
        if (m) {
          setTitle(m.title ?? "");
          setTitleKh(m.title_kh ?? "");
          setDescription(m.description ?? "");
          setGenres(parseGenresFromDb(m.genre));
          setCast(m.cast ?? "");
          setPrice(m.price != null ? String(m.price) : "");
          setReleaseDate(m.release_date ?? "");
          setDuration(m.duration != null ? String(m.duration) : "");
          setStatus(m.status ?? "draft");
          setTrailerUrl(m.trailer_url ?? "");
          setIsPromotionHero(Boolean(m.is_promotion_hero));
          setFreeEpisodesCount(m.free_episodes_count != null ? String(m.free_episodes_count) : "");
          setTotalEpisodes(m.total_episodes != null ? String(m.total_episodes) : "");
          setSubscriptionPlanId(m.subscription_plan_id ?? "");
        }
      })
      .catch(() => setMovie(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (movie?.type === "series") loadEpisodes();
    else setEpisodes([]);
  }, [movie?.type, loadEpisodes]);

  const artworkPreviewUrls = useMemo(() => {
    const next: Record<ArtworkRole, string | null> = {
      "thumbnail-phone": null,
      "thumbnail-laptop": null,
      "cover-phone": null,
      "cover-laptop": null,
    };
    for (const role of ARTWORK_ROLES_ORDER) {
      const file = artworkByRole[role];
      if (file) next[role] = URL.createObjectURL(file);
    }
    return next;
  }, [artworkByRole]);

  useEffect(() => {
    return () => {
      for (const role of ARTWORK_ROLES_ORDER) {
        const url = artworkPreviewUrls[role];
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, [artworkPreviewUrls]);

  function openEditEpisode(ep: SeriesEpisode) {
    setEditingEpisode(ep);
    setEditEpisodeTitle(ep.title || "");
    setEditEpisodeDuration(ep.duration != null ? String(ep.duration) : "");
    setEditEpisodeFree(ep.is_free_preview);
    setEditEpisodeVideo(null);
  }

  async function saveEpisodeEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEpisode) return;
    setSavingEpisode(true);
    try {
      const formData = new FormData();
      formData.set("title", editEpisodeTitle.trim() || "Episode");
      formData.set("duration", editEpisodeDuration);
      formData.set("is_free_preview", String(editEpisodeFree));
      if (editEpisodeVideo && editEpisodeVideo.size > 0) formData.set("video", editEpisodeVideo);
      const res = await fetch(
        `/api/movies/${id}/episodes/${editingEpisode.id}`,
        { method: "PATCH", body: formData }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to update episode");
        return;
      }
      setEditingEpisode(null);
      loadEpisodes();
    } finally {
      setSavingEpisode(false);
    }
  }

  async function confirmDeleteEpisode() {
    if (!deleteConfirmEpisode) return;
    const episodeId = deleteConfirmEpisode.id;
    const wasFreePreview = deleteConfirmEpisode.is_free_preview;
    setDeleteConfirmEpisode(null);
    setDeletingEpisodeId(episodeId);
    try {
      const res = await fetch(`/api/movies/${id}/episodes/${episodeId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to delete episode");
        return;
      }
      loadEpisodes();
      setTotalEpisodes(episodes.length > 1 ? String(episodes.length - 1) : "0");
      if (wasFreePreview) {
        const freeCount = episodes.filter((e) => e.is_free_preview).length;
        if (freeCount > 0) setFreeEpisodesCount(String(freeCount - 1));
      }
    } finally {
      setDeletingEpisodeId(null);
    }
  }

  async function addEpisodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addEpisodeVideo || addEpisodeVideo.size === 0) {
      alert("Video file is required.");
      return;
    }
    setAddingEpisode(true);
    try {
      const formData = new FormData();
      formData.set("title", addEpisodeTitle.trim() || "Episode");
      formData.set("duration", addEpisodeDuration);
      formData.set("is_free_preview", String(addEpisodeFree));
      formData.set("video", addEpisodeVideo);
      const res = await fetch(`/api/movies/${id}/episodes`, { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to add episode");
        return;
      }
      setShowAddEpisode(false);
      setAddEpisodeTitle("");
      setAddEpisodeDuration("");
      setAddEpisodeFree(false);
      setAddEpisodeVideo(null);
      loadEpisodes();
      setTotalEpisodes(String(episodes.length + 1));
      if (addEpisodeFree) setFreeEpisodesCount(String(Number(freeEpisodesCount || 0) + 1));
    } finally {
      setAddingEpisode(false);
    }
  }

  async function uploadSelectedArtwork(): Promise<Record<string, string>> {
    const thumbnailFile = artworkByRole["thumbnail-laptop"] ?? artworkByRole["thumbnail-phone"];
    const coverFile = artworkByRole["cover-phone"] ?? artworkByRole["cover-laptop"];
    if (!thumbnailFile && !coverFile) {
      return {};
    }

    for (const file of [thumbnailFile, coverFile].filter(Boolean) as File[]) {
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error(`Artwork too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
      }
    }

    const initBody: Record<string, unknown> = {};
    if (thumbnailFile) {
      initBody.thumbnailType = thumbnailFile.type;
      initBody.thumbnailSize = thumbnailFile.size;
    }
    if (coverFile) {
      initBody.coverType = coverFile.type;
      initBody.coverSize = coverFile.size;
    }

    const initRes = await fetch(`/api/movies/${id}/replace-media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(initBody),
    });
    const initData = await initRes.json();
    if (!initRes.ok) throw new Error(initData.error ?? "Failed to get upload URL");

    const uploads: Promise<Response>[] = [];
    if (thumbnailFile && initData.thumbnail?.uploadUrl) {
      uploads.push(
        fetch(initData.thumbnail.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": thumbnailFile.type },
          body: thumbnailFile,
        })
      );
    }
    if (coverFile && initData.cover?.uploadUrl) {
      uploads.push(
        fetch(initData.cover.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": coverFile.type },
          body: coverFile,
        })
      );
    }

    const uploadResults = await Promise.all(uploads);
    if (uploadResults.some((res) => !res.ok)) {
      throw new Error("One or more artwork uploads failed");
    }

    const patchBody: Record<string, string> = {};
    if (initData.thumbnail?.publicUrl) patchBody.thumbnail_url = initData.thumbnail.publicUrl;
    if (initData.cover?.publicUrl) patchBody.cover_url = initData.cover.publicUrl;

    return patchBody;
  }

  async function handleReplaceVideo() {
    if (!newVideoFile) return;
    if (newVideoFile.size > MAX_VIDEO_BYTES) {
      toastError(`Video too large (max ${MAX_VIDEO_BYTES / 1024 / 1024 / 1024}GB)`);
      return;
    }
    setIsReplacingVideo(true);
    setVideoUploadProgress(0);
    setVideoUploadStats(null);
    videoAbortRef.current = new AbortController();
    try {
      const initRes = await fetch(`/api/movies/${id}/replace-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoType: newVideoFile.type, videoSize: newVideoFile.size }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error ?? "Failed to initialize upload");

      videoMetaRef.current = { uploadId: initData.video.uploadId, key: initData.video.key };

      const uploadResult = await uploadFileInParallel({
        file: newVideoFile,
        partUrls: initData.video.partUrls,
        partSize: initData.video.partSize,
        concurrency: 8,
        abortSignal: videoAbortRef.current.signal,
        onProgress: (p) => {
          setVideoUploadProgress(Math.round(p.percentage * 0.95));
          setVideoUploadStats(p);
        },
      });

      setVideoUploadProgress(98);

      const completeRes = await fetch(`/api/movies/${id}/replace-media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: initData.video.uploadId,
          key: initData.video.key,
          parts: uploadResult.parts,
        }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error ?? "Failed to finalize upload");

      setVideoUploadProgress(100);
      setMovie((prev) => prev ? { ...prev, video_url: completeData.video_url } : prev);
      setNewVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = "";
      toastSuccess("Video replaced!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (videoMetaRef.current) {
        fetch(`/api/movies/${id}/replace-media`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(videoMetaRef.current),
        }).catch(() => {});
      }
      if (msg.toLowerCase().includes("abort")) {
        toastError("Upload cancelled");
      } else {
        toastError(msg);
      }
    } finally {
      setIsReplacingVideo(false);
      setVideoUploadProgress(0);
      setVideoUploadStats(null);
      videoAbortRef.current = null;
      videoMetaRef.current = null;
    }
  }

  async function handleSubmit() {
    if (!movie) return;
    setError(null);
    setIsSaving(true);
    try {
      const artworkPatch = await uploadSelectedArtwork();
      const body: Record<string, unknown> = {
        title: title.trim(),
        title_kh: titleKh.trim() || null,
        description: description.trim() || null,
        genre: serializeGenresToDb(genres),
        cast: cast.trim() || null,
        release_date: releaseDate || null,
        duration: duration ? Number(duration) : null,
        status,
        trailer_url: trailerUrl.trim() || null,
        is_promotion_hero: isPromotionHero,
        ...artworkPatch,
      };
      if (movie.type === "single") {
        body.price = price ? Number(price) : null;
      } else {
        body.free_episodes_count = freeEpisodesCount ? Number(freeEpisodesCount) : null;
        body.total_episodes = totalEpisodes ? Number(totalEpisodes) : null;
        body.subscription_plan_id = subscriptionPlanId || null;
      }
      const res = await fetch(`/api/movies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update movie");
        return;
      }
      setArtworkByRole(emptyArtwork());
      router.push(`/movies/${id}`);
    } catch {
      setError("Failed to update movie");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <PageLoadingState title="Loading edit workspace" description="Preparing movie data and editable fields." />;
  }

  if (!movie) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">Movie not found.</p>
        <Link href="/movies">
          <Button variant="secondary">Back to Movies</Button>
        </Link>
      </div>
    );
  }

  const listHref = movie.type === "series" ? "/movies/series" : "/movies/single";
  const planOptions = [
    { value: "", label: "No plan" },
    ...plans.map((p) => ({ value: p.id, label: `${p.name} ($${p.price})` })),
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/movies" className="hover:text-slate-900 dark:hover:text-white transition-colors">Movies</Link>
            <span>/</span>
            <Link href={listHref} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              {movie.type === "series" ? "Series" : "Single"}
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium truncate max-w-40">{movie.title}</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit movie</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/movies/${id}`}>
            <Button variant="outline" size="sm">← Back</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 px-4 py-3 text-sm text-red-800 dark:text-red-200 flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic info */}
          <Card padding="lg">
              <CardHeader title="Basic info" subtitle="Titles, description, genres, and cast." />
              <div className="space-y-4 mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Title (English)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Movie title" required />
                  <Input label="Title (Khmer)" value={titleKh} onChange={(e) => setTitleKh(e.target.value)} placeholder="ឈ្មោះភាពយន្ត" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none transition-colors text-sm"
                  />
                </div>
                <GenreMultiSelect
                  value={genres}
                  onChange={setGenres}
                  hint="Pick from the list and/or add your own below."
                />
                <CastInput label="Cast" value={cast} onChange={setCast} placeholder="Actor name" />
              </div>
            </Card>

          {/* Media */}
          <Card padding="lg">
            <CardHeader title="Media" subtitle="Upload one movie thumbnail and one movie cover." />
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {(["thumbnail-laptop", "cover-phone"] as ArtworkRole[]).map((role) => {
                const currentUrl =
                  role === "thumbnail-laptop"
                    ? movie.thumbnail_url
                    : movie.cover_url;
                const previewClass =
                  role === "cover-phone" ? "w-28" : "w-44";

                return (
                  <div key={role} className="space-y-3">
                    <ArtworkDropSlot
                      role={role}
                      label={role === "thumbnail-laptop" ? "Movie thumbnail" : "Movie cover"}
                      description={
                        role === "thumbnail-laptop"
                          ? "Main thumbnail image for this movie."
                          : "Main cover image for this movie."
                      }
                      file={
                        role === "thumbnail-laptop"
                          ? (artworkByRole["thumbnail-laptop"] ?? artworkByRole["thumbnail-phone"])
                          : (artworkByRole["cover-phone"] ?? artworkByRole["cover-laptop"])
                      }
                      onChange={(file) =>
                        setArtworkByRole((prev) =>
                          role === "thumbnail-laptop"
                            ? { ...prev, "thumbnail-phone": file, "thumbnail-laptop": file }
                            : { ...prev, "cover-phone": file, "cover-laptop": file }
                        )
                      }
                    />
                    {(artworkPreviewUrls[role] || currentUrl) ? (
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          {artworkPreviewUrls[role] ? "Selected preview" : "Current"}
                        </p>
                        <div className={`rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 ${previewClass} ${MOVIE_ARTWORK_ASPECT_CLASS[role]}`}>
                          <Image
                            src={artworkPreviewUrls[role] ?? currentUrl!}
                            alt={MOVIE_ARTWORK_SLOTS[role].label}
                            width={300}
                            height={180}
                            unoptimized
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Video (single only) */}
              {movie.type === "single" && (
                <div className="space-y-3 sm:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Video</p>
                  {movie.video_url && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{movie.video_url.split("/").pop()}</span>
                    </div>
                  )}
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => setNewVideoFile(e.target.files?.[0] ?? null)} />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left truncate"
                  >
                    {newVideoFile ? newVideoFile.name : "Choose video…"}
                  </button>
                  {newVideoFile && <p className="text-xs text-slate-400">{formatBytes(newVideoFile.size)}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!newVideoFile || isReplacingVideo}
                      isLoading={isReplacingVideo}
                      onClick={handleReplaceVideo}
                    >
                      {isReplacingVideo ? "Uploading…" : "Upload"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Pricing / Series access */}
          {movie.type === "single" ? (
            <SinglePricingSection price={price} setPrice={setPrice} />
          ) : (
            <SeriesAccessSection
              freeEpisodesCount={freeEpisodesCount}
              setFreeEpisodesCount={setFreeEpisodesCount}
              totalEpisodes={totalEpisodes}
              setTotalEpisodes={setTotalEpisodes}
              subscriptionPlanId={subscriptionPlanId}
              setSubscriptionPlanId={setSubscriptionPlanId}
              planOptions={planOptions}
            />
          )}

          {/* Episodes (series only) */}
          {movie.type === "series" && (
            <SeriesEpisodesPanel
              episodes={episodes}
              episodesLoading={episodesLoading}
              deletingEpisodeId={deletingEpisodeId}
              onOpenAddEpisode={() => setShowAddEpisode(true)}
              onOpenEditEpisode={openEditEpisode}
              onRequestDeleteEpisode={setDeleteConfirmEpisode}
              editingEpisode={editingEpisode}
              setEditingEpisode={setEditingEpisode}
              editEpisodeTitle={editEpisodeTitle}
              setEditEpisodeTitle={setEditEpisodeTitle}
              editEpisodeDuration={editEpisodeDuration}
              setEditEpisodeDuration={setEditEpisodeDuration}
              editEpisodeFree={editEpisodeFree}
              setEditEpisodeFree={setEditEpisodeFree}
              setEditEpisodeVideo={setEditEpisodeVideo}
              savingEpisode={savingEpisode}
              onSaveEpisodeEdit={saveEpisodeEdit}
              showAddEpisode={showAddEpisode}
              setShowAddEpisode={setShowAddEpisode}
              addEpisodeTitle={addEpisodeTitle}
              setAddEpisodeTitle={setAddEpisodeTitle}
              addEpisodeDuration={addEpisodeDuration}
              setAddEpisodeDuration={setAddEpisodeDuration}
              addEpisodeFree={addEpisodeFree}
              setAddEpisodeFree={setAddEpisodeFree}
              setAddEpisodeVideo={setAddEpisodeVideo}
              addingEpisode={addingEpisode}
              onAddEpisodeSubmit={addEpisodeSubmit}
              deleteConfirmEpisode={deleteConfirmEpisode}
              setDeleteConfirmEpisode={setDeleteConfirmEpisode}
              onConfirmDeleteEpisode={confirmDeleteEpisode}
            />
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card padding="lg" className="lg:sticky lg:top-6">
            <CardHeader
              title="Details"
              subtitle={movie.type === "series" ? "Date, duration, status, and trailer (YouTube or direct link)." : "Date, duration, status, trailer."}
            />
            <div className="mt-1 space-y-4">
              <Input label="Release date" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
              <Input label="Duration (minutes)" type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="—" />
              <Select
                label="Status"
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                  { value: "archived", label: "Archived" },
                ]}
                value={status}
                onChange={(e) => setStatus(e.target.value as Movie["status"])}
              />
              <Input label="Trailer URL" type="url" value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} placeholder="https://..." />
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                <input
                  type="checkbox"
                  checked={isPromotionHero}
                  onChange={(e) => setIsPromotionHero(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Show this movie in promotion hero section
                </span>
              </label>
            </div>
          </Card>

          {/* Save actions */}
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => void handleSubmit()} isLoading={isSaving} disabled={isSaving} className="w-full justify-center">
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
            <Link href={`/movies/${id}`} className="w-full">
              <Button type="button" variant="outline" disabled={isSaving} className="w-full justify-center">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Video upload progress modal */}
      {isReplacingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-linear-to-r from-red-500 to-rose-500 transition-all duration-200 ease-linear"
                style={{ width: `${videoUploadProgress}%` }}
              />
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    Replacing video — {newVideoFile?.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {videoUploadProgress < 95 ? "Uploading chunks…" : videoUploadProgress < 100 ? "Finalizing…" : "Done!"}
                  </p>
                </div>
                <span className="shrink-0 text-2xl font-bold tabular-nums text-red-500">
                  {videoUploadProgress}%
                </span>
              </div>

              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-red-500 to-rose-500 transition-all duration-200 ease-linear"
                  style={{ width: `${videoUploadProgress}%` }}
                />
              </div>

              {videoUploadStats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Speed</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{formatSpeed(videoUploadStats.speed)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Done</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{formatBytes(videoUploadStats.uploadedBytes)}</p>
                    <p className="text-xs text-slate-400 tabular-nums">/ {formatBytes(videoUploadStats.totalBytes)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">ETA</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {videoUploadStats.eta > 0 ? formatTime(videoUploadStats.eta) : "—"}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => videoAbortRef.current?.abort()}
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
