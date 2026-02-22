"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MovieFilters } from "@/components/movies/MovieFilters";
import { MovieList } from "@/components/movies/MovieList";
import { useMovies } from "@/hooks/useMovies";

function UploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function SingleMoviesPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { movies, isLoading } = useMovies({
    type: "single",
    status: status || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/movies"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 inline-block"
          >
            ← Movies
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Single Movies</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            One-time purchase titles.
          </p>
        </div>
        <Link href="/upload/single">
          <Button leftIcon={<UploadIcon />}>Add Movie</Button>
        </Link>
      </div>

      <MovieFilters
        status={status}
        type=""
        search={search}
        onStatusChange={setStatus}
        onTypeChange={() => {}}
        onSearchChange={setSearch}
        showTypeFilter={false}
      />

      <MovieList movies={movies} isLoading={isLoading} />
    </div>
  );
}
