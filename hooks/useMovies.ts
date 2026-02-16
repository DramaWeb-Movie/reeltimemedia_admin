"use client";

import { useState, useEffect } from "react";
import type { Movie } from "@/types";

export interface UseMoviesFilters {
  status?: string;
  type?: string;
  search?: string;
}

export function useMovies(filters: UseMoviesFilters = {}) {
  const { status = "", type = "", search = "" } = filters;
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (type) params.set("type", type);
        if (search) params.set("search", search);
        const res = await fetch(`/api/movies?${params}`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.movies ?? []);
        } else {
          setMovies([]);
        }
      } catch {
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [status, type, search]);

  return { movies, isLoading };
}
