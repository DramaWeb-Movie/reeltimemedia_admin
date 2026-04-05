import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface PlanOption {
  value: string;
  label: string;
}

interface SeriesAccessSectionProps {
  freeEpisodesCount: string;
  setFreeEpisodesCount: (value: string) => void;
  totalEpisodes: string;
  setTotalEpisodes: (value: string) => void;
  subscriptionPlanId: string;
  setSubscriptionPlanId: (value: string) => void;
  planOptions: PlanOption[];
}

export function SeriesAccessSection({
  freeEpisodesCount,
  setFreeEpisodesCount,
  totalEpisodes,
  setTotalEpisodes,
  subscriptionPlanId,
  setSubscriptionPlanId,
  planOptions,
}: SeriesAccessSectionProps) {
  return (
    <Card padding="lg">
      <CardHeader title="Series access" subtitle="Subscription and free preview settings." />
      <div className="mt-1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Free episodes (count)"
            type="number"
            min="0"
            value={freeEpisodesCount}
            onChange={(e) => setFreeEpisodesCount(e.target.value)}
            placeholder="0"
          />
          <Input
            label="Total episodes"
            type="number"
            min="0"
            value={totalEpisodes}
            onChange={(e) => setTotalEpisodes(e.target.value)}
            placeholder="—"
          />
        </div>
        <Select
          label="Restrict to plan (optional)"
          options={planOptions}
          value={subscriptionPlanId}
          onChange={(e) => setSubscriptionPlanId(e.target.value)}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">Leave &quot;No plan&quot; for any subscriber.</p>
      </div>
    </Card>
  );
}
