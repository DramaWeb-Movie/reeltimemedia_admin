"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { UserDetails } from "@/components/users/UserDetails";
import type { User, UserPurchaseMovie } from "@/types";

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<UserPurchaseMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) {
        setUser(null);
        setPurchases([]);
        return;
      }
      const data = await res.json();
      setUser(data.user ?? null);
      setPurchases(data.purchases ?? []);
    } catch {
      setUser(null);
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-500">User not found.</p>
        <Link href="/users">
          <Button variant="secondary" className="mt-4">
            Back to Users
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
      </div>

      <UserDetails user={user} purchases={purchases} onUserUpdated={setUser} />
    </div>
  );
}
