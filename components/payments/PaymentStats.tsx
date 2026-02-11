import { Card } from "@/components/ui/Card";
import type { PaymentStats as PaymentStatsType } from "@/types";

interface PaymentStatsProps {
  stats: PaymentStatsType;
}

export function PaymentStats({ stats }: PaymentStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card padding="md">
        <p className="text-sm text-slate-400">Total Revenue</p>
        <p className="mt-1 text-xl font-bold text-white">
          ${stats.totalRevenue.toLocaleString()}
        </p>
      </Card>
      <Card padding="md">
        <p className="text-sm text-slate-400">Pending</p>
        <p className="mt-1 text-xl font-bold text-amber-400">
          ${stats.pendingAmount.toLocaleString()}
        </p>
      </Card>
      <Card padding="md">
        <p className="text-sm text-slate-400">Completed</p>
        <p className="mt-1 text-xl font-bold text-emerald-400">
          {stats.completedCount.toLocaleString()}
        </p>
      </Card>
      <Card padding="md">
        <p className="text-sm text-slate-400">Failed</p>
        <p className="mt-1 text-xl font-bold text-red-400">
          {stats.failedCount.toLocaleString()}
        </p>
      </Card>
    </div>
  );
}
