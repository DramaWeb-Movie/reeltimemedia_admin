"use client";

import { useState, useEffect } from "react";
import type { User } from "@/types";

export function useUsers(searchQuery?: string, subscriptionFilter?: string) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (subscriptionFilter) params.set("subscription", subscriptionFilter);
        const res = await fetch(`/api/users?${params}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users ?? []);
        } else {
          setUsers([]);
        }
      } catch {
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [searchQuery, subscriptionFilter]);

  return { users, isLoading };
}
