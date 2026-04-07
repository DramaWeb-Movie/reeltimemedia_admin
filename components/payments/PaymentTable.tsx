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

function userCell(payment: Payment) {
  if (payment.user) {
    const label = payment.user.full_name?.trim() || payment.user.email;
    return <span className="max-w-[200px] truncate block">{label}</span>;
  }
  return (
    <span className="font-mono text-xs" title={payment.user_id}>
      {payment.user_id.slice(0, 8)}…
    </span>
  );
}

export function PaymentTable({ payments, isLoading }: PaymentTableProps) {
  return (
    <Table tableClassName="min-w-[960px]">
      <TableHeader>
        <TableHead>Date</TableHead>
        <TableHead>User</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead>Currency</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Method</TableHead>
        <TableHead>Transaction ID</TableHead>
        <TableHead>Description</TableHead>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <td colSpan={8} className="px-6 py-16 text-center">
              <Spinner size="lg" className="mx-auto" />
            </td>
          </TableRow>
        ) : payments.length === 0 ? (
          <TableEmpty colSpan={8} message="No payments found. Try adjusting your filters." />
        ) : (
          payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="whitespace-nowrap tabular-nums">
                {new Date(payment.created_at).toLocaleString()}
              </TableCell>
              <TableCell>{userCell(payment)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
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
              <TableCell className="max-w-[140px]">
                <span
                  className="block truncate font-mono text-xs"
                  title={payment.transaction_id ?? undefined}
                >
                  {payment.transaction_id ?? "—"}
                </span>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <span
                  className="block truncate text-slate-600 dark:text-slate-400"
                  title={payment.description ?? undefined}
                >
                  {payment.description ?? "—"}
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
