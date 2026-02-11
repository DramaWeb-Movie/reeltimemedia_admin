"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string }[]>([]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, type: f.type })),
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Movie</h1>
        <p className="mt-1 text-slate-400">
          Add a new movie to your content library.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-sm font-medium text-slate-400 mb-4">Video & Thumbnail</h3>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-colors
              ${isDragging ? "border-amber-500 bg-amber-500/10" : "border-slate-700 hover:border-slate-600"}
            `}
          >
            <svg
              className="w-12 h-12 mx-auto text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-400">
              Drag and drop video & thumbnail here, or click to browse
            </p>
            <p className="text-xs text-slate-600 mt-1">
              MP4, WebM up to 2GB • JPG, PNG for thumbnail
            </p>
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((f, i) => (
                  <p key={i} className="text-sm text-amber-400">
                    {f.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-400 mb-4">Details</h3>
          <div className="space-y-4">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Movie title"
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the movie"
                rows={4}
                className="
                  w-full px-3 py-2 rounded-lg
                  bg-slate-800/80 border border-slate-700
                  text-white placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500
                  resize-none
                "
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Drama, Romance"
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="120"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Release Date"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
              <Select
                label="Status"
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "published", label: "Published" },
                ]}
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" isLoading={isUploading}>
            Upload Movie
          </Button>
          <Button type="button" variant="outline">
            Save as Draft
          </Button>
        </div>
      </form>
    </div>
  );
}
