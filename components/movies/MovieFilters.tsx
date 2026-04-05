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
  showTypeFilter?: boolean;
}

export function MovieFilters({
  status,
  type,
  search,
  onStatusChange,
  onTypeChange,
  onSearchChange,
  showTypeFilter = true,
}: MovieFiltersProps) {
  return (
    <div className="flex flex-row flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-0 max-w-sm">
        <Input
          placeholder="Search by title or genre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {showTypeFilter && (
        <div className="w-36 shrink-0">
          <Select
            options={[
              { value: "", label: "All types" },
              { value: "series", label: "Series" },
              { value: "single", label: "Single Movie" },
            ]}
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
          />
        </div>
      )}
      <div className="w-40 shrink-0">
        <Select
          options={[
            { value: "", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
            { value: "archived", label: "Archived" },
          ]}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        />
      </div>
    </div>
  );
}
