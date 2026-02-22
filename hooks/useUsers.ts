"use client";

import { useState, useEffect } from "react";
import type { User } from "@/types";

export function useUsers(page: number = 1) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "10");
        const res = await fetch(`/api/users?${params}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users ?? []);
          setHasMore(data.pagination?.hasMore ?? false);
        } else {
          setUsers([]);
          setHasMore(false);
        }
      } catch {
        setUsers([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [page]);

  return { users, isLoading, hasMore };
}
