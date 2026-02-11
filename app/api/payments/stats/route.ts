import { NextResponse } from "next/server";
import type { PaymentStats } from "@/types";

const MOCK_STATS: PaymentStats = {
  totalRevenue: 89420,
  pendingAmount: 1250,
  completedCount: 3420,
  failedCount: 23,
};

export async function GET() {
  try {
    return NextResponse.json({ stats: MOCK_STATS });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch payment stats" },
      { status: 500 }
    );
  }
}
