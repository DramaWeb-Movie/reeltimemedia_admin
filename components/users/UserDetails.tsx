"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import type { User, UserPurchaseMovie } from "@/types";

const subscriptionBadge: Record<User["subscription_type"], "default" | "success" | "info"> = {
  free: "default",
  premium: "success",
  lifetime: "info",
};

interface UserDetailsProps {
  user: User;
  purchases: UserPurchaseMovie[];
  onUserUpdated: (user: User) => void;
}

export function UserDetails({ user, purchases, onUserUpdated }: UserDetailsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [blockAction, setBlockAction] = useState<"block" | "unblock">("block");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openConfirm = (action: "block" | "unblock") => {
    setBlockAction(action);
    setActionError(null);
    setConfirmOpen(true);
  };

  const applyBan = async () => {
    setActionError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: blockAction === "block" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || "Request failed");
        return;
      }
      if (data.user) onUserUpdated(data.user as User);
      setConfirmOpen(false);
    } catch {
      setActionError("Request failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <Card className="text-center">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto flex items-center justify-center text-2xl font-bold text-slate-700 dark:text-slate-300">
              {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              {user.full_name || "No name"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge variant={subscriptionBadge[user.subscription_type]}>{user.subscription_type}</Badge>
              {user.blocked && <Badge variant="danger">Blocked</Badge>}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full" type="button" disabled>
              Edit User
            </Button>
            <div className="mt-3 space-y-2">
              {user.blocked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-emerald-600/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  onClick={() => openConfirm("unblock")}
                >
                  Unblock user
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => openConfirm("block")}>
                  Block user
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="flex-1 space-y-6">
          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Account details</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-600 dark:text-slate-500">User ID</dt>
                <dd className="text-slate-900 dark:text-white font-mono text-xs break-all">{user.id}</dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Subscription status</dt>
                <dd className="text-slate-900 dark:text-white">{user.subscription_status}</dd>
              </div>
              <div>
                <dt className="text-slate-600 dark:text-slate-500">Subscription expires</dt>
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
                <dt className="text-slate-600 dark:text-slate-500">Last updated</dt>
                <dd className="text-slate-900 dark:text-white">
                  {new Date(user.updated_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Purchased movies</h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">
              From completed payments linked to a title (movie ID, metadata, or matching description).
            </p>
            <Table tableClassName="min-w-[520px]">
              <TableHeader>
                <TableHead>Title</TableHead>
                <TableHead>Purchased</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 ? (
                  <TableEmpty
                    colSpan={3}
                    message="No movie purchases found for this user. Payments may not reference a movie yet."
                  />
                ) : (
                  purchases.map((p) => (
                    <TableRow key={p.movieId}>
                      <TableCell className="font-medium text-slate-900 dark:text-white">{p.title}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 tabular-nums text-sm whitespace-nowrap">
                        {p.purchasedAt ? new Date(p.purchasedAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/movies/${p.movieId}/edit`}
                          className="text-sm text-red-600 hover:text-red-500 dark:text-red-400 font-medium"
                        >
                          Edit movie
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => !isSaving && setConfirmOpen(false)}
        title={blockAction === "block" ? "Block this user?" : "Unblock this user?"}
        size="sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {blockAction === "block"
            ? "They will not be able to sign in until unblocked. You cannot block your own account from this screen."
            : "They will be able to sign in again."}
        </p>
        {actionError && <p className="text-sm text-red-500 mt-3">{actionError}</p>}
        <div className="flex gap-3 mt-6 justify-end">
          <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={blockAction === "block" ? "danger" : "primary"}
            onClick={applyBan}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : blockAction === "block" ? "Block user" : "Unblock user"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
