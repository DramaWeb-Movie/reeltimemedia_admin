import { PaymentCard } from "./PaymentCard";
import { Spinner } from "@/components/ui/Spinner";
import type { Payment } from "@/types";

interface PaymentListProps {
  payments: Payment[];
  isLoading: boolean;
}

export function PaymentList({ payments, isLoading }: PaymentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
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
