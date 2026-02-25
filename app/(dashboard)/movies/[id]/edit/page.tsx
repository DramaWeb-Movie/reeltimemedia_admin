"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!movie) return;
    setError(null);
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
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
    <div className="space-y-8 pb-12">
      {/* Page header */}
      <div className="flex flex-col gap-3">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/movies"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Movies
          </Link>
          <span className="text-slate-400 dark:text-slate-500">/</span>
          <Link
            href={listHref}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {movie.type === "series" ? "Series" : "Single"}
          </Link>
          <span className="text-slate-400 dark:text-slate-500">/</span>
          <Link
            href={`/movies/${id}`}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors truncate max-w-[180px]"
            title={movie.title}
          >
            {movie.title}
          </Link>
          <span className="text-slate-400 dark:text-slate-500">/</span>
          <span className="text-slate-900 dark:text-white font-medium">Edit</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/movies/${id}`}>
            <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400">
              ← Back to movie
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Edit movie
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 px-4 py-3.5 text-sm text-red-800 dark:text-red-200 flex items-start gap-3"
          >
            <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Basic info + Details: two columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card padding="lg">
              <CardHeader
                title="Basic info"
                subtitle="Title, description, genre, and cast."
              />
              <div className="space-y-5">
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Movie title"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description"
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Genre"
                    options={GENRE_OPTIONS}
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Select genre"
                  />
                  <CastInput label="Cast" value={cast} onChange={setCast} placeholder="Actor name" />
                </div>
              </div>
            </Card>

            {movie.type === "single" ? (
              <Card padding="lg">
                <CardHeader
                  title="Pricing"
                  subtitle="One-time purchase price in USD."
                />
                <Input
                  label="Price (USD)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2.99"
                />
              </Card>
            ) : (
              <Card padding="lg">
                <CardHeader
                  title="Series access"
                  subtitle="Any active subscriber can watch by default. Mark episodes as free preview below."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Free episodes (count)"
                    type="number"
                    min="0"
                    value={freeEpisodesCount}
                    onChange={(e) => setFreeEpisodesCount(e.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Total episodes"
                    type="number"
                    min="0"
                    value={totalEpisodes}
                    onChange={(e) => setTotalEpisodes(e.target.value)}
                    placeholder="—"
                  />
                </div>
                <div className="mt-4">
                  <Select
                    label="Restrict to plan (optional)"
                    options={planOptions}
                    value={subscriptionPlanId}
                    onChange={(e) => setSubscriptionPlanId(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Leave &quot;No plan&quot; for any subscriber; choose a plan to restrict access.
                  </p>
                </div>
              </Card>
            )}

            {movie.type === "series" && (
              <Card padding="lg">
                <CardHeader
                  title="Episodes"
                  subtitle={`${episodes.length} episode${episodes.length !== 1 ? "s" : ""}. Add, edit, or remove episodes.`}
                  action={
                    <Button type="button" size="sm" onClick={() => setShowAddEpisode(true)}>
                      + Add episode
                    </Button>
                  }
                />
                {episodesLoading ? (
                  <div className="py-12 flex justify-center">
                    <Spinner size="md" />
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-12 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No episodes yet.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowAddEpisode(true)}
                    >
                      Add first episode
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="max-h-[380px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 w-14">#</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Title</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 w-24">Duration</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 w-20">Free</th>
                            <th className="w-32 py-3 px-4" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {episodes.map((ep) => (
                            <tr
                              key={ep.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{ep.episode_number}</td>
                              <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{ep.title || `Episode ${ep.episode_number}`}</td>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{ep.duration != null ? `${ep.duration} min` : "—"}</td>
                              <td className="py-3 px-4">{ep.is_free_preview ? <Badge variant="success">Yes</Badge> : <span className="text-slate-400">—</span>}</td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditEpisode(ep)}>
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirmEpisode(ep)}
                                    disabled={deletingEpisodeId === ep.id}
                                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                  >
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

          {/* Sidebar: Details */}
          <div className="lg:col-span-1">
            <Card padding="lg" className="lg:sticky lg:top-6">
              <CardHeader
                title="Details"
                subtitle="Release date, duration, status, and trailer."
              />
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <Input
                    label="Release date"
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                  />
                  <Input
                    label="Duration (minutes)"
                    type="number"
                    min="0"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="—"
                  />
                </div>
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
                <Input
                  label="Trailer URL"
                  type="url"
                  value={trailerUrl}
                  onChange={(e) => setTrailerUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </Card>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/80">
          <Button type="submit" isLoading={isSaving} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
          <Link href={`/movies/${id}`}>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </Link>
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
    </div>
  );
}
