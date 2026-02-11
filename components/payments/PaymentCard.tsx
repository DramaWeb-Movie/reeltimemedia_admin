import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Payment } from "@/types";

interface PaymentCardProps {
  payment: Payment;
}

const statusBadge: Record<Payment["payment_status"], "default" | "success" | "warning" | "danger"> = {
  pending: "warning",
  completed: "success",
  failed: "danger",
  refunded: "default",
};

export function PaymentCard({ payment }: PaymentCardProps) {
  const userLabel = payment.user
    ? payment.user.full_name || payment.user.email
    : `User #${payment.user_id.slice(0, 8)}`;
  const formattedDate = new Date(payment.created_at).toLocaleDateString();
  const formattedTime = new Date(payment.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white">
              ${payment.amount.toFixed(2)} {payment.currency}
            </p>
            <Badge variant={statusBadge[payment.payment_status]}>
              {payment.payment_status}
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {payment.description ?? "Payment"}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">{userLabel}</p>
          <p className="text-xs text-slate-600 mt-1">
            {formattedDate} at {formattedTime}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-500">Method</p>
          <p className="text-sm text-slate-300 capitalize">
            {payment.payment_method.replace("_", " ")}
          </p>
          {payment.transaction_id && (
            <>
              <p className="text-xs text-slate-500 mt-2">Transaction</p>
              <p className="text-xs font-mono text-slate-400 truncate max-w-[140px]">
                {payment.transaction_id}
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
