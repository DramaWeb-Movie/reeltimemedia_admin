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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [status, type, search]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (type) params.set("type", type);
        if (search) params.set("search", search);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        const res = await fetch(`/api/movies?${params}`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.movies ?? []);
          setTotal(data.pagination?.total ?? 0);
          setTotalPages(data.pagination?.totalPages ?? 1);
        } else {
          setMovies([]);
          setTotal(0);
          setTotalPages(1);
        }
      } catch {
        setMovies([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [status, type, search, page, pageSize]);

  const removeById = (id: string) =>
    setMovies((prev) => prev.filter((m) => m.id !== id));

  return {
    movies,
    isLoading,
    removeById,
    page,
    pageSize,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
    setPage,
  };
}
