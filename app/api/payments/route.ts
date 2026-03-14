import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Payment, PaymentStatus } from "@/types";

type PaymentRow = {
  id: string;
  user_id: string;
  qr_id?: string | null;
  transaction_id?: string | null;
  content_type?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  description?: string | null;
  created_at?: string | null;
};

const VALID_STATUSES: PaymentStatus[] = ["pending", "completed", "failed", "refunded"];

function mapRowToPayment(row: PaymentRow): Payment {
  const status = row.payment_status && VALID_STATUSES.includes(row.payment_status as PaymentStatus)
    ? (row.payment_status as PaymentStatus)
    : "completed";
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount) || 0;
  return {
    id: row.id,
    user_id: row.user_id,
    amount,
    currency: row.currency ?? "USD",
    payment_method: (row.payment_method as Payment["payment_method"]) ?? "other",
    payment_status: status,
    transaction_id: row.transaction_id ?? null,
    description: row.description ?? row.content_type ?? "Payment",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from("payments")
      .select("*", { count: "exact" })
      .order("id", { ascending: false })
      .range(from, to);

    if (statusFilter && VALID_STATUSES.includes(statusFilter as PaymentStatus)) {
      query = query.eq("payment_status", statusFilter);
    }

    const { data: rows, error, count } = await query;

    if (error) {
      console.error("[payments] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    const payments = (rows ?? []).map(mapRowToPayment);
    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return NextResponse.json({
      payments,
      pagination: { page, perPage, total, totalPages },
    });
  } catch (err) {
    console.error("[payments] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
