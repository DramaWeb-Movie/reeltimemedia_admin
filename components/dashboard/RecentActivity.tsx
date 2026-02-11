import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { RecentActivity as RecentActivityType } from "@/types";

interface RecentActivityProps {
  activities: RecentActivityType[];
}

function getActivityIcon(type: RecentActivityType["type"]) {
  switch (type) {
    case "user":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "payment":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "movie":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      );
    default:
      return null;
  }
}

function getActivityBadge(type: RecentActivityType["type"]) {
  switch (type) {
    case "user":
      return <Badge variant="info">User</Badge>;
    case "payment":
      return <Badge variant="success">Payment</Badge>;
    case "movie":
      return <Badge variant="warning">Movie</Badge>;
    default:
      return null;
  }
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader title="Recent Activity" subtitle="Latest updates across the platform" />
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">
            No recent activity
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-4 p-3 rounded-lg hover:bg-slate-800/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white">
                    {activity.title}
                  </p>
                  {getActivityBadge(activity.type)}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {activity.description}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
