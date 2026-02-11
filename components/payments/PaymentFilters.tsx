"use client";

import { Select } from "@/components/ui/Select";

interface PaymentFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
}

export function PaymentFilters({ status, onStatusChange }: PaymentFiltersProps) {
  return (
    <Select
      options={[
        { value: "", label: "All statuses" },
        { value: "pending", label: "Pending" },
        { value: "completed", label: "Completed" },
        { value: "failed", label: "Failed" },
        { value: "refunded", label: "Refunded" },
      ]}
      value={status}
      onChange={(e) => onStatusChange(e.target.value)}
      className="w-full sm:w-48"
    />
  );
}
