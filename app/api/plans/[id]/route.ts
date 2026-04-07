import { NextResponse } from "next/server";
import type { SubscriptionPlan } from "@/types";
import { billingPeriodFromStorage, parseBillingPeriodInput } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";

function mapRow(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    price: Number(row.price),
    currency: (row.currency as string) ?? "USD",
    billing_period: billingPeriodFromStorage(row.billing_period),
    description: (row.description as string) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const name = body.name?.trim();
    const price = parseFloat(body.price);
    const billing_period = parseBillingPeriodInput(body.billing_period);
    if (!billing_period) {
      return NextResponse.json({ error: "Invalid billing_period" }, { status: 400 });
    }
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
      .update({
        name,
        price,
        currency,
        billing_period,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update plan" },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ plan: mapRow(data) });
  } catch {
    return NextResponse.json(
      { error: "Failed to update subscription plan" },
      { status: 500 }
    );
  }
}
