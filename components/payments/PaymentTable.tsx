import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import type { Payment } from "@/types";

const statusVariant: Record<Payment["payment_status"], "success" | "warning" | "danger" | "default"> = {
  completed: "success",
  pending: "warning",
  failed: "danger",
  refunded: "default",
};

interface PaymentTableProps {
  payments: Payment[];
  isLoading: boolean;
}

export function PaymentTable({ payments, isLoading }: PaymentTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableHead>Date</TableHead>
        <TableHead>User ID</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead>Currency</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Method</TableHead>
        <TableHead>Transaction ID</TableHead>
        <TableHead>Description</TableHead>
      </TableHeader>
      <TableBody>
        {payments.length === 0 ? (
          <TableEmpty colSpan={8} message="No payments found. Try adjusting your filters." />
        ) : (
          payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="whitespace-nowrap">
                {new Date(payment.created_at).toLocaleString()}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {payment.user_id.slice(0, 8)}…
              </TableCell>
              <TableCell className="text-right font-medium">
                {payment.amount.toFixed(2)}
              </TableCell>
              <TableCell>{payment.currency}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[payment.payment_status]}>
                  {payment.payment_status}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">
                {payment.payment_method.replace("_", " ")}
              </TableCell>
              <TableCell className="font-mono text-xs max-w-[140px] truncate">
                {payment.transaction_id ?? "—"}
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-slate-600 dark:text-slate-400">
                {payment.description ?? "—"}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
