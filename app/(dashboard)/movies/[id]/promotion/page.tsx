"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { MAX_IMAGE_BYTES } from "@/lib/r2/mime";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Movie } from "@/types";
import { ArrowLeft, ExternalLink, Film, ImageIcon, Trash2, Upload } from "lucide-react";

const ACCEPT = "image/jpeg,image/png,image/webp";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MoviePromotionBannerPage() {
  const params = useParams();
  const id = params.id as string;
  const inputRef = useRef<HTMLInputElement>(null);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeCurrentBanner, setRemoveCurrentBanner] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/movies/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMovie(data?.movie ?? null))
      .catch(() => setMovie(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  const selectedPreviewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile]
  );

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  const currentBannerUrl = !removeCurrentBanner ? movie?.promotion_banner_url ?? null : null;
  const effectiveBannerUrl = selectedPreviewUrl ?? currentBannerUrl;
  const hasExistingBanner = Boolean(movie?.promotion_banner_url);
  const canSave = Boolean(selectedFile || (hasExistingBanner && removeCurrentBanner));

  function handlePick(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      const message = "Please choose a JPG, PNG, or WebP image.";
      setError(message);
      toastError(message);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const message = `Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB).`;
      setError(message);
      toastError(message);
      return;
    }
    setSelectedFile(file);
    setRemoveCurrentBanner(false);
    setError(null);
  }

  async function handleSave() {
    if (!movie || !canSave) return;

    setIsSaving(true);
    setError(null);

    try {
      let nextBannerUrl: string | null = removeCurrentBanner
        ? null
        : (movie.promotion_banner_url ?? null);

      if (selectedFile) {
        const initRes = await fetch(`/api/movies/${id}/replace-media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promotionBannerType: selectedFile.type,
            promotionBannerSize: selectedFile.size,
          }),
        });
        const initData = await initRes.json().catch(() => ({}));
        if (!initRes.ok || !initData.promotionBanner?.uploadUrl || !initData.promotionBanner?.publicUrl) {
          throw new Error(initData.error ?? "Failed to prepare promotion banner upload.");
        }

        const uploadRes = await fetch(initData.promotionBanner.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload the promotion banner image.");
        }

        nextBannerUrl = initData.promotionBanner.publicUrl;
      }

      const saveRes = await fetch(`/api/movies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotion_banner_url: nextBannerUrl }),
      });
      const saveData = await saveRes.json().catch(() => ({}));

      if (!saveRes.ok) {
        throw new Error(saveData.error ?? "Failed to save promotion banner.");
      }

      setMovie(saveData.movie ?? null);
      setSelectedFile(null);
      setRemoveCurrentBanner(false);
      if (inputRef.current) inputRef.current.value = "";
      toastSuccess(nextBannerUrl ? "Promotion banner updated." : "Promotion banner removed.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save promotion banner.";
      setError(message);
      toastError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!movie) {
    return (
      <Card className="mx-auto max-w-2xl rounded-[28px] border-dashed px-6 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400">
          <Film className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white">
          Movie not found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          We could not load this title, so the promotion-banner workspace is unavailable right now.
        </p>
        <Link href="/movies" className="mt-6 inline-block">
          <Button variant="secondary">Back to Movies</Button>
        </Link>
      </Card>
    );
  }

  const listHref = movie.type === "series" ? "/movies/series" : "/movies/single";

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/movies" className="transition-colors hover:text-slate-900 dark:hover:text-white">
              Movies
            </Link>
            <span>/</span>
            <Link
              href={listHref}
              className="transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              {movie.type === "series" ? "Series" : "Single"}
            </Link>
            <span>/</span>
            <Link
              href={`/movies/${id}`}
              className="max-w-40 truncate transition-colors hover:text-slate-900 dark:hover:text-white md:max-w-none"
            >
              {movie.title}
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900 dark:text-white">Promotion Banner</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Promotion Banner
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Manage the dedicated banner artwork for promoted placements without opening the main movie edit form.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/movies/${id}`}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Movie
            </Button>
          </Link>
          <Link href={`/movies/${id}/edit`}>
            <Button variant="outline">Edit Movie</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="relative isolate overflow-hidden rounded-[32px] border border-slate-200/80 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)] dark:border-slate-700/80">
            {effectiveBannerUrl ? (
              <div className="absolute inset-0">
                <Image
                  src={effectiveBannerUrl}
                  alt={`${movie.title} promotion banner`}
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-r from-slate-950/92 via-slate-950/72 to-slate-900/28" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800" />
            )}

            <div className="absolute -top-16 right-8 h-52 w-52 rounded-full bg-red-500/18 blur-3xl" />
            <div className="absolute -bottom-20 left-0 h-60 w-60 rounded-full bg-cyan-500/12 blur-3xl" />

            <div className="relative flex min-h-[360px] flex-col justify-end px-6 py-6 md:min-h-[460px] md:px-10 md:py-10">
              <div className="max-w-2xl">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge className="border-white/12 bg-white/10 text-white" variant="neutral">
                    Promotion Preview
                  </Badge>
                  <Badge className="border-white/12 bg-white/10 text-white" variant="neutral">
                    {selectedFile
                      ? "Unsaved changes"
                      : movie.promotion_banner_url
                        ? "Saved banner"
                        : "No saved banner"}
                  </Badge>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                  Featured Placement
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">
                  {movie.title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-white/75 md:text-base">
                  {movie.description ||
                    "Upload dedicated promotion artwork here so the movie has a stronger first impression in featured placements."}
                </p>
                <p className="mt-4 text-xs text-white/55">
                  Updated {formatDate(movie.updated_at)}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[24px]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Status
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                {movie.promotion_banner_url && !removeCurrentBanner
                  ? "Banner configured"
                  : "Banner not configured"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Save a banner image to make this movie ready for promoted surfaces.
              </p>
            </Card>

            <Card className="rounded-[24px]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Recommended Size
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                1920 × 1080 px
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                A 16:9 image keeps the banner consistent across desktop and featured layouts.
              </p>
            </Card>

            <Card className="rounded-[24px]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Formats
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                JPG, PNG, WebP
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Keep the file under {MAX_IMAGE_BYTES / 1024 / 1024}MB for faster admin uploads.
              </p>
            </Card>
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="rounded-[28px]">
            <CardHeader
              title="Banner Asset"
              subtitle="Upload, replace, or remove the promotion banner for this movie."
            />

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
            />

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handlePick(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`cursor-pointer rounded-[24px] border-2 border-dashed p-5 text-center transition-colors ${
                selectedFile
                  ? "border-emerald-500/40 bg-emerald-500/8"
                  : isDragging
                    ? "border-red-500 bg-red-500/8"
                    : "border-slate-300 bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600"
              }`}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                {selectedFile ? "Selected new promotion banner" : "Drop image here or click to choose"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Use dedicated banner artwork so editors can promote this title without reusing the normal thumbnail or cover.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Active asset
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                      {selectedFile
                        ? selectedFile.name
                        : movie.promotion_banner_url && !removeCurrentBanner
                          ? "Saved promotion banner"
                          : "No active banner"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {selectedFile
                        ? `${formatBytes(selectedFile.size)} · pending save`
                        : movie.promotion_banner_url && !removeCurrentBanner
                          ? "This artwork is currently stored for promoted placements."
                          : "Upload a banner image to activate promotion artwork for this movie."}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge
                      variant={
                        selectedFile
                          ? "warning"
                          : movie.promotion_banner_url && !removeCurrentBanner
                            ? "success"
                            : "neutral"
                      }
                    >
                      {selectedFile
                        ? "Pending"
                        : movie.promotion_banner_url && !removeCurrentBanner
                          ? "Saved"
                          : "Empty"}
                    </Badge>
                  </div>
                </div>

                {movie.promotion_banner_url && !removeCurrentBanner ? (
                  <a
                    href={movie.promotion_banner_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-600 transition-colors hover:text-red-500 dark:text-red-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open current banner
                  </a>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={!canSave || isSaving}
                  className="w-full justify-center"
                >
                  {isSaving ? "Saving…" : selectedFile ? "Save Promotion Banner" : "Confirm Removal"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => inputRef.current?.click()}
                  disabled={isSaving}
                  leftIcon={<ImageIcon className="h-4 w-4" />}
                >
                  {movie.promotion_banner_url ? "Replace Banner Image" : "Choose Banner Image"}
                </Button>

                {selectedFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-center"
                    disabled={isSaving}
                    onClick={() => {
                      setSelectedFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                  >
                    Clear Selected File
                  </Button>
                ) : movie.promotion_banner_url && !removeCurrentBanner ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
                    disabled={isSaving}
                    onClick={() => setRemoveCurrentBanner(true)}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                  >
                    Remove Current Banner
                  </Button>
                ) : null}

                {removeCurrentBanner ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-center"
                    disabled={isSaving}
                    onClick={() => setRemoveCurrentBanner(false)}
                  >
                    Undo Removal
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px]">
            <CardHeader
              title="Usage Notes"
              subtitle="Keep the banner purpose-built for promotion."
            />
            <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              <p>
                Use a wide image with strong focal points near the center so it still looks good on responsive layouts.
              </p>
              <p>
                Avoid putting important text near the edges because product overlays or gradients may cover them later.
              </p>
              <p>
                This page only manages the stored promotion artwork. Your frontend can read
                {" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">promotion_banner_url</code>
                {" "}
                when you are ready to display it.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
