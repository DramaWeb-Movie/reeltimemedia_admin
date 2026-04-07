export const BILLING_PERIODS = [
  "weekly",
  "monthly",
  "three_months",
  "six_months",
  "yearly",
] as const;

export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/** UI labels for plan forms and selects. */
export const BILLING_PERIOD_OPTIONS: { value: BillingPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "three_months", label: "Every 3 months" },
  { value: "six_months", label: "Every 6 months" },
  { value: "yearly", label: "Yearly" },
];

export function parseBillingPeriodInput(raw: unknown): BillingPeriod | null {
  if (typeof raw !== "string") return null;
  return (BILLING_PERIODS as readonly string[]).includes(raw) ? (raw as BillingPeriod) : null;
}

/** Normalize values read from the database (unknown/legacy → default monthly). */
export function billingPeriodFromStorage(raw: unknown): BillingPeriod {
  return parseBillingPeriodInput(raw) ?? "monthly";
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_period: BillingPeriod;
  description: string | null;
  created_at: string;
  updated_at: string;
}
