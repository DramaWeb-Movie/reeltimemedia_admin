"use client";

import { useState, useEffect } from "react";
import type { Movie } from "@/types";

const MOCK_MOVIES: Movie[] = [
  {
    id: "1",
    title: "Midnight Drama",
    description: "A gripping tale of love and betrayal in the city.",
    genre: "Drama",
    release_date: "2024-01-15",
    duration: 120,
    thumbnail_url: null,
    video_url: null,
    subtitle_url: null,
    status: "published",
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    title: "Eternal Love",
    description: "A romance that transcends time.",
    genre: "Romance",
    release_date: "2024-02-01",
    duration: 95,
    thumbnail_url: null,
    video_url: null,
    subtitle_url: null,
    status: "published",
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "3",
    title: "Shadow of the Past",
    description: "Uncover the secrets that haunt a family.",
    genre: "Thriller",
    release_date: "2024-03-10",
    duration: 110,
    thumbnail_url: null,
    video_url: null,
    subtitle_url: null,
    status: "draft",
    created_at: "2024-02-15T00:00:00Z",
    updated_at: "2024-02-20T00:00:00Z",
  },
  {
    id: "4",
    title: "City Lights",
    description: "Life in the fast lane.",
    genre: "Drama",
    release_date: "2024-04-05",
    duration: 88,
    thumbnail_url: null,
    video_url: null,
    subtitle_url: null,
    status: "archived",
    created_at: "2023-12-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export function useMovies(statusFilter?: string, searchQuery?: string) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (searchQuery) params.set("search", searchQuery);
        const res = await fetch(`/api/movies?${params}`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.movies ?? MOCK_MOVIES);
        } else {
          setMovies(MOCK_MOVIES);
        }
      } catch {
        setMovies(MOCK_MOVIES);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [statusFilter, searchQuery]);

  return { movies, isLoading };
}
