"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { User } from "@/types";

const subscriptionBadge: Record<User["subscription_type"], "default" | "success" | "info"> = {
  free: "default",
  premium: "success",
  lifetime: "info",
};

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [id]);

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

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 flex-shrink-0">
          <Card className="text-center">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto flex items-center justify-center text-2xl font-bold text-slate-700 dark:text-slate-300">
              {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              {user.full_name || "No name"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{user.email}</p>
            <Badge variant={subscriptionBadge[user.subscription_type]} className="mt-3">
              {user.subscription_type}
            </Badge>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Edit User
            </Button>
          </Card>
        </div>
        <div className="flex-1 space-y-6">
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Account Details</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-600 dark:text-slate-500">User ID</dt>
                <dd className="text-slate-900 dark:text-white font-mono text-xs">{user.id}</dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Subscription Status</dt>
                <dd className="text-slate-900 dark:text-white">{user.subscription_status}</dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Subscription Expires</dt>
                <dd className="text-slate-900 dark:text-white">
                  {user.subscription_expires_at
                    ? new Date(user.subscription_expires_at).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Joined</dt>
                <dd className="text-slate-900 dark:text-white">
                  {new Date(user.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Last Updated</dt>
                <dd className="text-slate-900 dark:text-white">
                  {new Date(user.updated_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Recent Activity</h3>
            <p className="text-slate-600 dark:text-slate-500 text-sm">No recent activity to display.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
