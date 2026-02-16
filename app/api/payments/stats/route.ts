import { NextResponse } from "next/server";
import type { PaymentStats } from "@/types";

const EMPTY_STATS: PaymentStats = {
  totalRevenue: 0,
  pendingAmount: 0,
  completedCount: 0,
  failedCount: 0,
};

export async function GET() {
  try {
    return NextResponse.json({ stats: EMPTY_STATS });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch payment stats" },
      { status: 500 }
    );
  }
}
