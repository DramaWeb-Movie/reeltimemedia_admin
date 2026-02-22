import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import type { User } from "@/types";

interface UserListProps {
  users: User[];
  isLoading: boolean;
}

const subscriptionBadge: Record<User["subscription_type"], "default" | "success" | "info"> = {
  free: "default",
  premium: "success",
  lifetime: "info",
};

export function UserList({ users, isLoading }: UserListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-500">No users found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Name</th>
            <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Email</th>
            <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Subscription</th>
            <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Joined</th>
            <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="font-medium text-slate-900 dark:text-white">
                  {user.full_name || "—"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.email}</td>
              <td className="px-4 py-3">
                <Badge variant={subscriptionBadge[user.subscription_type]}>
                  {user.subscription_type}
                </Badge>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/users/${user.id}`}
                  className="text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
