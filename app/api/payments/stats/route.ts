import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";
import type { PaymentStats } from "@/types";

const log = createLogger("api:payments:stats");

async function getSupabaseClient() {
  try {
    return createAdminClient();
  } catch (err) {
    log.warn("Admin client unavailable, falling back to server client", err);
    return await createClient();
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*");

    if (error) {
      log.error("Payment stats query failed", error);
      return NextResponse.json({ error: "Failed to fetch payment stats" }, { status: 500 });
    }

    const stats = (data ?? []).reduce<PaymentStats>(
      (acc, row) => {
        const amount = Number(row.amount) || 0;
        const status = (row.payment_status ?? row.status ?? "") as string;

        if (status === "completed") {
          acc.totalRevenue += amount;
          acc.completedCount += 1;
        } else if (status === "pending") {
          acc.pendingAmount += amount;
        } else if (status === "failed") {
          acc.failedCount += 1;
        }

        return acc;
      },
      {
        totalRevenue: 0,
        pendingAmount: 0,
        completedCount: 0,
        failedCount: 0,
      }
    );

    return NextResponse.json({ stats });
  } catch (err) {
    log.error("Payment stats API error", err);
    return NextResponse.json({ error: "Failed to fetch payment stats" }, { status: 500 });
  }
}
