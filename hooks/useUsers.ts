"use client";

import { useState, useEffect } from "react";
import type { User } from "@/types";

const MOCK_USERS: User[] = [
  {
    id: "1",
    email: "john.doe@example.com",
    full_name: "John Doe",
    subscription_type: "premium",
    subscription_status: "active",
    subscription_expires_at: "2025-03-15T00:00:00Z",
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "2",
    email: "jane.smith@example.com",
    full_name: "Jane Smith",
    subscription_type: "free",
    subscription_status: "none",
    subscription_expires_at: null,
    created_at: "2024-02-15T00:00:00Z",
    updated_at: "2024-02-15T00:00:00Z",
  },
  {
    id: "3",
    email: "alex@example.com",
    full_name: "Alex Johnson",
    subscription_type: "lifetime",
    subscription_status: "active",
    subscription_expires_at: null,
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-03-01T00:00:00Z",
  },
];

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
          setUsers(data.users ?? MOCK_USERS);
        } else {
          setUsers(MOCK_USERS);
        }
      } catch {
        setUsers(MOCK_USERS);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [searchQuery, subscriptionFilter]);

  return { users, isLoading };
}
