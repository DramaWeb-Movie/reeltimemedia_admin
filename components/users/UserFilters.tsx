"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface UserFiltersProps {
  search: string;
  subscription: string;
  onSearchChange: (search: string) => void;
  onSubscriptionChange: (subscription: string) => void;
}

export function UserFilters({
  search,
  subscription,
  onSearchChange,
  onSubscriptionChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Input
        placeholder="Search by email or name..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select
        options={[
          { value: "", label: "All subscriptions" },
          { value: "free", label: "Free" },
          { value: "premium", label: "Premium" },
          { value: "lifetime", label: "Lifetime" },
        ]}
        value={subscription}
        onChange={(e) => onSubscriptionChange(e.target.value)}
        className="sm:w-40"
      />
    </div>
  );
}
