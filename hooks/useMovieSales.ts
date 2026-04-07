"use client";

import { useState, useEffect, useCallback } from "react";
import type { MovieSalesListResponse } from "@/types";

export function useMovieSales(rangeStartIso: string, rangeEndIso: string, page: number, enabled: boolean) {
  const [data, setData] = useState<MovieSalesListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      setData(null);
      setFetchError(null);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        from: rangeStartIso,
        to: rangeEndIso,
        page: String(page),
      });
      const res = await fetch(`/api/sales/movies?${params}`);
      if (res.ok) {
        const json = (await res.json()) as MovieSalesListResponse;
        setData(json);
      } else {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
        setData(null);
        setFetchError(errBody?.error ?? "Failed to load sales");
      }
    } catch {
      setData(null);
      setFetchError("Failed to load sales");
    } finally {
      setIsLoading(false);
    }
  }, [rangeStartIso, rangeEndIso, page, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, fetchError, reload: load };
}
