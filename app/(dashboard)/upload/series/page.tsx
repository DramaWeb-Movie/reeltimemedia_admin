"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toastError, toastSuccess } from "@/lib/toast";
import type { EpisodeInput } from "@/types";

type SeriesAccess = "membership" | "free";

const STEPS = [
  { id: 1, title: "Access", description: "Membership or free" },
  { id: 2, title: "Details", description: "Series info" },
  { id: 3, title: "Episodes", description: "Add episodes" },
  { id: 4, title: "Review", description: "Confirm & upload" },
] as const;

export default function SeriesUploadPage() {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  // Step 1: Access
  const [seriesAccess, setSeriesAccess] = useState<SeriesAccess>("membership");

  // Step 2: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [cast, setCast] = useState("");

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
    if (step === 2) return !!title.trim();
    if (step === 3) return episodes.length > 0;
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
    setIsUploading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toastSuccess("Series uploaded successfully");
    } catch {
      toastError("Failed to upload series. Please try again.");
    } finally {
      setIsUploading(false);
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
                <span className="font-semibold block">Membership</span>
                <span className="text-sm mt-1 block">Subscription required. You&apos;ll mark which episodes are free to preview in Step 3.</span>
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
                <span className="font-semibold block">Free</span>
                <span className="text-sm mt-1 block">All episodes free to watch. No subscription needed.</span>
              </button>
            </div>
          </Card>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Step 2: Series Details</h3>
            <div className="space-y-4">
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Series title" required />
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
                <Input label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Drama, Romance" />
                <Input label="Cast" value={cast} onChange={(e) => setCast(e.target.value)} placeholder="Actor 1, Actor 2" hint="Comma-separated" />
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
                        <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => handleEpisodeFileChange(ep.id, e.target.files?.[0] ?? null)} />
                        {ep.videoFile ? <span className="text-sm text-emerald-600 dark:text-emerald-400">{ep.videoFile.name}</span> : <span className="text-sm text-slate-500">Select video (MP4, WebM)</span>}
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
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Access</p>
                <p className="font-medium text-slate-900 dark:text-white">{seriesAccess === "membership" ? "Membership required" : "Free"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Series</p>
                <p className="font-medium text-slate-900 dark:text-white">{title || "—"}</p>
                {description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description.slice(0, 100)}...</p>}
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
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack}>
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
            <Button type="submit" isLoading={isUploading}>
              Upload Series
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
