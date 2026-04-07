import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { User } from "@/types";

interface UserCardProps {
  user: User;
}

const subscriptionBadge: Record<User["subscription_type"], "default" | "success" | "info"> = {
  free: "default",
  premium: "success",
  lifetime: "info",
};

export function UserCard({ user }: UserCardProps) {
  const formattedDate = new Date(user.created_at).toLocaleDateString();

  return (
    <Link href={`/users/${user.id}`}>
      <Card className="cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg font-medium text-slate-700 dark:text-slate-300 group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors">
            {user.full_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors truncate">
              {user.full_name || "No name"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={subscriptionBadge[user.subscription_type]}>
                {user.subscription_type}
              </Badge>
              {user.blocked && (
                <Badge variant="danger" className="text-[10px] uppercase tracking-wide">
                  Blocked
                </Badge>
              )}
              {user.subscription_expires_at && user.subscription_type === "premium" && (
                <span className="text-xs text-slate-600 dark:text-slate-500">
                  Expires {new Date(user.subscription_expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">Joined {formattedDate}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
