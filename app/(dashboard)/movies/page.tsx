"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MovieFilters } from "@/components/movies/MovieFilters";
import { MovieList } from "@/components/movies/MovieList";
import { useMovies } from "@/hooks/useMovies";

export default function MoviesPage() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const { movies, isLoading } = useMovies({
    status: status || undefined,
    type: type || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Movies</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage single movies (one-time purchase) and series (subscription).
          </p>
        </div>
        <Link href="/upload">
          <Button leftIcon={<UploadIcon />}>Add Movie</Button>
        </Link>
      </div>

      <MovieFilters
        status={status}
        type={type}
        search={search}
        onStatusChange={setStatus}
        onTypeChange={setType}
        onSearchChange={setSearch}
      />

      <MovieList movies={movies} isLoading={isLoading} />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
