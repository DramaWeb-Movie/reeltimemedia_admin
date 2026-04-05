"use client";

import { Select } from "@/components/ui/Select";

interface PaymentFiltersProps {
  descriptionType: string;
  onDescriptionTypeChange: (descriptionType: string) => void;
}

export function PaymentFilters({ descriptionType, onDescriptionTypeChange }: PaymentFiltersProps) {
  return (
    <Select
      options={[
        { value: "", label: "All descriptions" },
        { value: "movie", label: "Movie" },
        { value: "subscription", label: "Subscription" },
      ]}
      value={descriptionType}
      onChange={(e) => onDescriptionTypeChange(e.target.value)}
      className="w-full sm:w-48"
    />
  );
}
