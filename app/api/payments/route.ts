import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";
import type { Payment } from "@/types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const log = createLogger("api:payments:list");

function toSafePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE;
  return parsed;
}

function toSafeLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function mapPaymentRow(row: Record<string, unknown>): Payment {
  const paymentStatus =
    (row.payment_status as Payment["payment_status"]) ??
    (row.status as Payment["payment_status"]) ??
    "pending";

  const paymentMethod =
    (row.payment_method as Payment["payment_method"]) ??
    (row.method as Payment["payment_method"]) ??
    "other";

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    amount: Number(row.amount) || 0,
    currency: (row.currency as string) ?? "USD",
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    transaction_id: (row.transaction_id as string) ?? null,
    description: (row.description as string) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

async function getSupabaseClient() {
  try {
    return createAdminClient();
  } catch (err) {
    log.warn("Admin client unavailable, falling back to server client", err);
    return await createClient();
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = toSafePage(searchParams.get("page"));
    const limit = toSafeLimit(searchParams.get("limit"));
    const description = searchParams.get("description")?.trim();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = await getSupabaseClient();

    const buildBaseQuery = () =>
      supabase
        .from("payments")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    let result = description
      ? await buildBaseQuery().ilike("description", `%${description}%`)
      : await buildBaseQuery();

    // Some deployments may not have a description column in payments.
    if (result.error && description) {
      log.warn("Description filter failed, retrying without DB filter", result.error);
      result = await buildBaseQuery();
      if (!result.error && result.data) {
        result.data = result.data.filter((row) => {
          const desc = String((row as Record<string, unknown>).description ?? "").toLowerCase();
          return desc.includes(description.toLowerCase());
        });
      }
    }

    const { data, error, count } = result;

    if (error) {
      log.error("Payments query failed", error);
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      payments: (data ?? []).map((row) => mapPaymentRow(row as Record<string, unknown>)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    log.error("Payments API error", err);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
