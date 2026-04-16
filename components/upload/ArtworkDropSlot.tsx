"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ArtworkRole } from "@/lib/constants/movie-artwork";
import { MOVIE_ARTWORK_SLOTS, ARTWORK_MAX_FILE_MB, MOVIE_ARTWORK_ASPECT_CLASS } from "@/lib/constants/movie-artwork";
import { MAX_IMAGE_BYTES } from "@/lib/r2/mime";

const ACCEPT = "image/jpeg,image/png,image/webp";

export function ArtworkDropSlot({
  role,
  file,
  onChange,
  label,
  description,
}: {
  role: ArtworkRole;
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const spec = MOVIE_ARTWORK_SLOTS[role];
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePick = (f: File | undefined | null) => {
    if (!f?.type.startsWith("image/")) return;
    onChange(f);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label ?? spec.label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description ?? spec.description}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
          <span className="font-medium text-slate-700 dark:text-slate-200">Target size:</span> {spec.targetPx} ·{" "}
          {spec.aspectNote}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          JPG, PNG, or WebP · up to {ARTWORK_MAX_FILE_MB}MB per file
        </p>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handlePick(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          file
            ? "border-emerald-500/50 bg-emerald-500/10"
            : isDragging
              ? "border-red-500 bg-red-500/10"
              : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="space-y-2">
            <div className={`mx-auto w-full max-w-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 ${MOVIE_ARTWORK_ASPECT_CLASS[role]}`}>
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={spec.label}
                  width={640}
                  height={360}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium break-all">{file.name}</p>
            {file.size > MAX_IMAGE_BYTES ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">File exceeds {ARTWORK_MAX_FILE_MB}MB — choose a smaller file.</p>
            ) : null}
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drop image or click</p>
          </>
        )}
      </div>
      {file ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}
