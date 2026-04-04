"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CastInput } from "@/components/ui/CastInput";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { GENRE_OPTIONS } from "@/lib/constants/genres";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  uploadFileInParallel,
  formatBytes,
  formatSpeed,
  formatTime,
  type UploadProgress,
} from "@/lib/upload/parallel-uploader";
import { MAX_VIDEO_BYTES, MAX_IMAGE_BYTES } from "@/lib/r2/mime";
import type { Movie } from "@/types";
import type { SubscriptionPlan } from "@/types";

interface SeriesEpisode {
  id: string;
  movie_id: string;
  episode_number: number;
  title: string;
  duration: number | null;
  video_url: string | null;
  is_free_preview: boolean;
  created_at: string;
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
  const [genre, setGenre] = useState("");
  const [cast, setCast] = useState("");
  const [price, setPrice] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<Movie["status"]>("draft");
  const [trailerUrl, setTrailerUrl] = useState("");
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

  // Thumbnail replacement
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [isReplacingThumbnail, setIsReplacingThumbnail] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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
          setGenre(m.genre ?? "");
          setCast(m.cast ?? "");
          setPrice(m.price != null ? String(m.price) : "");
          setReleaseDate(m.release_date ?? "");
          setDuration(m.duration != null ? String(m.duration) : "");
          setStatus(m.status ?? "draft");
          setTrailerUrl(m.trailer_url ?? "");
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

  async function handleReplaceThumbnail() {
    if (!newThumbnailFile) return;
    if (newThumbnailFile.size > MAX_IMAGE_BYTES) {
      toastError(`Thumbnail too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
      return;
    }
    setIsReplacingThumbnail(true);
    try {
      const initRes = await fetch(`/api/movies/${id}/replace-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailType: newThumbnailFile.type, thumbnailSize: newThumbnailFile.size }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error ?? "Failed to get upload URL");

      const putRes = await fetch(initData.thumbnail.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": newThumbnailFile.type },
        body: newThumbnailFile,
      });
      if (!putRes.ok) throw new Error("Failed to upload thumbnail");

      const patchRes = await fetch(`/api/movies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnail_url: initData.thumbnail.publicUrl }),
      });
      if (!patchRes.ok) throw new Error("Failed to save thumbnail URL");

      setMovie((prev) => prev ? { ...prev, thumbnail_url: initData.thumbnail.publicUrl } : prev);
      setNewThumbnailFile(null);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
      toastSuccess("Thumbnail updated!");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to replace thumbnail");
    } finally {
      setIsReplacingThumbnail(false);
    }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!movie) return;
    setError(null);
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        title_kh: titleKh.trim() || null,
        description: description.trim() || null,
        genre: genre || null,
        cast: cast.trim() || null,
        release_date: releaseDate || null,
        duration: duration ? Number(duration) : null,
        status,
        trailer_url: trailerUrl.trim() || null,
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
      router.push(`/movies/${id}`);
    } catch {
      setError("Failed to update movie");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
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
            <span className="text-slate-900 dark:text-white font-medium truncate max-w-[160px]">{movie.title}</span>
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

      <form id="main-form" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic info */}
          <Card padding="lg">
              <CardHeader title="Basic info" subtitle="Titles, description, genre, and cast." />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Genre" options={GENRE_OPTIONS} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Select genre" />
                  <CastInput label="Cast" value={cast} onChange={setCast} placeholder="Actor name" />
                </div>
              </div>
            </Card>

          {/* Media */}
          <Card padding="lg">
            <CardHeader title="Media" subtitle="Replace the cover image or video." />
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Thumbnail */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thumbnail</p>
                <div className="flex gap-3 items-start">
                  <div
                    className="shrink-0 w-14 aspect-[2/3] rounded-lg overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer hover:border-red-400 transition-colors"
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    {newThumbnailFile ? (
                      <img src={URL.createObjectURL(newThumbnailFile)} alt="" className="w-full h-full object-cover" />
                    ) : movie.thumbnail_url ? (
                      <img src={movie.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input ref={thumbnailInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setNewThumbnailFile(e.target.files?.[0] ?? null)} />
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left truncate"
                    >
                      {newThumbnailFile ? newThumbnailFile.name : "Choose image…"}
                    </button>
                    {newThumbnailFile && <p className="text-xs text-slate-400">{formatBytes(newThumbnailFile.size)}</p>}
                    <Button type="button" size="sm" variant="secondary" disabled={!newThumbnailFile || isReplacingThumbnail} isLoading={isReplacingThumbnail} onClick={handleReplaceThumbnail}>
                      {isReplacingThumbnail ? "Uploading…" : "Upload"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Video (single only) */}
              {movie.type === "single" && (
                <div className="space-y-3">
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
              <Card padding="lg">
                <CardHeader title="Pricing" subtitle="One-time purchase price in USD." />
                <div className="mt-1">
                  <Input label="Price (USD)" type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2.99" />
                </div>
              </Card>
            ) : (
              <Card padding="lg">
                <CardHeader title="Series access" subtitle="Subscription and free preview settings." />
                <div className="mt-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Free episodes (count)" type="number" min="0" value={freeEpisodesCount} onChange={(e) => setFreeEpisodesCount(e.target.value)} placeholder="0" />
                    <Input label="Total episodes" type="number" min="0" value={totalEpisodes} onChange={(e) => setTotalEpisodes(e.target.value)} placeholder="—" />
                  </div>
                  <Select label="Restrict to plan (optional)" options={planOptions} value={subscriptionPlanId} onChange={(e) => setSubscriptionPlanId(e.target.value)} />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Leave &quot;No plan&quot; for any subscriber.</p>
                </div>
              </Card>
            )}

          {/* Episodes (series only) */}
          {movie.type === "series" && (
            <Card padding="lg">
              <CardHeader
                title="Episodes"
                subtitle={`${episodes.length} episode${episodes.length !== 1 ? "s" : ""}`}
                action={<Button type="button" size="sm" onClick={() => setShowAddEpisode(true)}>+ Add episode</Button>}
              />
              {episodesLoading ? (
                <div className="py-10 flex justify-center"><Spinner size="md" /></div>
              ) : episodes.length === 0 ? (
                <div className="mt-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-10 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No episodes yet.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setShowAddEpisode(true)}>Add first episode</Button>
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
                        <tr>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 w-10">#</th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Title</th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 w-20">Duration</th>
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 w-16">Free</th>
                          <th className="w-28 py-2.5 px-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {episodes.map((ep) => (
                          <tr key={ep.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white text-xs">{ep.episode_number}</td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{ep.title || `Episode ${ep.episode_number}`}</td>
                            <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-xs">{ep.duration != null ? `${ep.duration}m` : "—"}</td>
                            <td className="py-2.5 px-4">{ep.is_free_preview ? <Badge variant="success">Yes</Badge> : <span className="text-slate-400 text-xs">—</span>}</td>
                            <td className="py-2.5 px-4">
                              <div className="flex gap-1.5">
                                <Button type="button" variant="ghost" size="sm" onClick={() => openEditEpisode(ep)}>Edit</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteConfirmEpisode(ep)} disabled={deletingEpisodeId === ep.id} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
                                  {deletingEpisodeId === ep.id ? "…" : "Delete"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card padding="lg" className="lg:sticky lg:top-6">
            <CardHeader title="Details" subtitle="Date, duration, status, trailer." />
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
            </div>
          </Card>

          {/* Save actions */}
          <div className="flex flex-col gap-2">
            <Button type="submit" form="main-form" isLoading={isSaving} disabled={isSaving} className="w-full justify-center">
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
            <Link href={`/movies/${id}`} className="w-full">
              <Button type="button" variant="outline" disabled={isSaving} className="w-full justify-center">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>
      </form>

    {/* Edit episode modal */}
      <Modal
        isOpen={!!editingEpisode}
        onClose={() => setEditingEpisode(null)}
        title={editingEpisode ? `Edit Episode ${editingEpisode.episode_number}` : ""}
        size="md"
      >
        {editingEpisode && (
          <form onSubmit={saveEpisodeEdit} className="space-y-5">
            <Input
              label="Title"
              value={editEpisodeTitle}
              onChange={(e) => setEditEpisodeTitle(e.target.value)}
              placeholder={`Episode ${editingEpisode.episode_number}`}
            />
            <Input
              label="Duration (min)"
              type="number"
              min="0"
              value={editEpisodeDuration}
              onChange={(e) => setEditEpisodeDuration(e.target.value)}
              placeholder="—"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editEpisodeFree}
                onChange={(e) => setEditEpisodeFree(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/50"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Free preview</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Replace video (optional)</label>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) => setEditEpisodeVideo(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-500 file:text-white file:text-sm file:cursor-pointer hover:file:bg-red-600"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={savingEpisode} disabled={savingEpisode}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingEpisode(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add episode modal */}
      <Modal
        isOpen={showAddEpisode}
        onClose={() => setShowAddEpisode(false)}
        title="Add episode"
        size="md"
      >
        <form onSubmit={addEpisodeSubmit} className="space-y-5">
          <Input
            label="Title"
            value={addEpisodeTitle}
            onChange={(e) => setAddEpisodeTitle(e.target.value)}
            placeholder="Episode title"
          />
          <Input
            label="Duration (min)"
            type="number"
            min="0"
            value={addEpisodeDuration}
            onChange={(e) => setAddEpisodeDuration(e.target.value)}
            placeholder="—"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addEpisodeFree}
              onChange={(e) => setAddEpisodeFree(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/50"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Free preview</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Video file (required)</label>
            <input
              type="file"
              accept="video/mp4,video/webm"
              required
              onChange={(e) => setAddEpisodeVideo(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-500 file:text-white file:text-sm file:cursor-pointer hover:file:bg-red-600"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={addingEpisode} disabled={addingEpisode}>
              Add episode
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAddEpisode(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirmEpisode}
        onClose={() => setDeleteConfirmEpisode(null)}
        onConfirm={confirmDeleteEpisode}
        title="Delete episode?"
        description={
          deleteConfirmEpisode
            ? `"${deleteConfirmEpisode.title || `Episode ${deleteConfirmEpisode.episode_number}`}" will be removed.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Video upload progress modal */}
      {isReplacingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-200 ease-linear"
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
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-200 ease-linear"
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
