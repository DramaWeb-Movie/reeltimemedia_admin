import { UserCard } from "./UserCard";
import { Spinner } from "@/components/ui/Spinner";
import type { User } from "@/types";

interface UserListProps {
  users: User[];
  isLoading: boolean;
}

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
        <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">
          Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
