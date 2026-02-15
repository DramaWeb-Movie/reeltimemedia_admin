import { NextResponse } from "next/server";
import type { SubscriptionPlan } from "@/types";

const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: "1",
    name: "Monthly Premium",
    price: 9.99,
    currency: "USD",
    billing_period: "monthly",
    description: "Full access to all series content",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Yearly Premium",
    price: 79.99,
    currency: "USD",
    billing_period: "yearly",
    description: "Full access to all series, save 33%",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export async function GET() {
  try {
    return NextResponse.json({ plans: MOCK_PLANS });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch subscription plans" },
      { status: 500 }
    );
  }
}
