import { NextResponse } from "next/server";
import type { PaymentStats } from "@/types";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";

const EMPTY_STATS: PaymentStats = {
  totalRevenue: 0,
  pendingAmount: 0,
  completedCount: 0,
  failedCount: 0,
};

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase.from("payments").select("*");

    if (error) {
      console.error("[payments/stats] Supabase error:", error);
      return NextResponse.json({ stats: EMPTY_STATS });
    }

    let totalRevenue = 0;
    let pendingAmount = 0;
    let completedCount = 0;
    let failedCount = 0;

    for (const row of rows ?? []) {
      const amount = Number((row as { amount?: unknown }).amount) || 0;
      const status = ((row as { payment_status?: string }).payment_status ?? "completed") as string;
      if (status === "completed") {
        totalRevenue += amount;
        completedCount += 1;
      } else if (status === "pending") {
        pendingAmount += amount;
      } else if (status === "failed") {
        failedCount += 1;
      }
    }

    const stats: PaymentStats = {
      totalRevenue,
      pendingAmount,
      completedCount,
      failedCount,
    };
    return NextResponse.json({ stats });
  } catch (err) {
    console.error("[payments/stats] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch payment stats" },
      { status: 500 }
    );
  }
}
