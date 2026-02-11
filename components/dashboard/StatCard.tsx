import { Card } from "@/components/ui/Card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
}

export function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <Card padding="md" className="hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`mt-2 text-sm font-medium ${
                trend.isPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
