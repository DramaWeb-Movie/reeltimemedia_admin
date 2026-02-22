"use client";

import { useState } from "react";
import { UserList } from "@/components/users/UserList";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/Button";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const { users, isLoading, hasMore } = useUsers(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Manage your user base and subscriptions.</p>
      </div>

      <UserList users={users} isLoading={isLoading} />

      {!isLoading && users.length > 0 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-400">Page {page}</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
