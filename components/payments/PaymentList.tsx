import { PaymentCard } from "./PaymentCard";
import { PageLoadingState } from "@/components/ui/PageLoadingState";
import type { Payment } from "@/types";

interface PaymentListProps {
  payments: Payment[];
  isLoading: boolean;
}

export function PaymentList({ payments, isLoading }: PaymentListProps) {
  if (isLoading) {
    return (
      <PageLoadingState
        title="Loading payments"
        description="Fetching the latest transaction records."
        minHeightClass="min-h-[280px]"
      />
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-500">No payments found.</p>
        <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">
          Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <PaymentCard key={payment.id} payment={payment} />
      ))}
    </div>
  );
}
