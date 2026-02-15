"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface MovieFiltersProps {
  status: string;
  type: string;
  search: string;
  onStatusChange: (status: string) => void;
  onTypeChange: (type: string) => void;
  onSearchChange: (search: string) => void;
}

export function MovieFilters({
  status,
  type,
  search,
  onStatusChange,
  onTypeChange,
  onSearchChange,
}: MovieFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
      <Input
        placeholder="Search by title or genre..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select
        options={[
          { value: "", label: "All types" },
          { value: "series", label: "Series" },
          { value: "single", label: "Single Movie" },
        ]}
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className="sm:w-36"
      />
      <Select
        options={[
          { value: "", label: "All statuses" },
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
          { value: "archived", label: "Archived" },
        ]}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="sm:w-40"
      />
    </div>
  );
}
