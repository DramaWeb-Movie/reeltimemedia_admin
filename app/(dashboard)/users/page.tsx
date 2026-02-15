"use client";

import { useState } from "react";
import { UserFilters } from "@/components/users/UserFilters";
import { UserList } from "@/components/users/UserList";
import { useUsers } from "@/hooks/useUsers";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [subscription, setSubscription] = useState("");
  const { users, isLoading } = useUsers(
    search || undefined,
    subscription || undefined
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Manage your user base and subscriptions.</p>
      </div>

      <UserFilters
        search={search}
        subscription={subscription}
        onSearchChange={setSearch}
        onSubscriptionChange={setSubscription}
      />

      <UserList users={users} isLoading={isLoading} />
    </div>
  );
}
