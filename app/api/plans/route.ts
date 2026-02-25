import { NextResponse } from "next/server";
import type { SubscriptionPlan } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";

function mapRow(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    price: Number(row.price),
    currency: (row.currency as string) ?? "USD",
    billing_period: (row.billing_period as SubscriptionPlan["billing_period"]) ?? "monthly",
    description: (row.description as string) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch subscription plans" },
        { status: 500 }
      );
    }
    const plans = (data ?? []).map(mapRow);
    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch subscription plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const name = body.name?.trim();
    const price = parseFloat(body.price);
    const billing_period = body.billing_period === "yearly" ? "yearly" : "monthly";
    const description = body.description?.trim() || null;
    const currency = body.currency?.trim() || "USD";

    if (!name || Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Invalid name or price" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("subscription_plans")
      .insert({
        name,
        price,
        currency,
        billing_period,
        description,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to create plan" },
        { status: 500 }
      );
    }
    return NextResponse.json({ plan: mapRow(data) });
  } catch {
    return NextResponse.json(
      { error: "Failed to create subscription plan" },
      { status: 500 }
    );
  }
}
