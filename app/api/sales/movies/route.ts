import { NextResponse } from "next/server";
import type { MovieSalesListResponse } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createLogger } from "@/lib/logger";
import { isPaymentCompleted, rankMoviesBySalesCount } from "@/lib/sales/movie-sales-from-payments";

const log = createLogger("api:sales:movies");
const PAGE_SIZE = 20;

function toPage(value: string | null): number {
  const n = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const page = toPage(searchParams.get("page"));

    const hasFrom = Boolean(fromParam);
    const hasTo = Boolean(toParam);
    const rangeStart = hasFrom ? new Date(fromParam as string) : null;
    const rangeEnd = hasTo ? new Date(toParam as string) : null;

    if (rangeStart && Number.isNaN(rangeStart.getTime())) {
      return NextResponse.json({ error: "Invalid from date." }, { status: 400 });
    }
    if (rangeEnd && Number.isNaN(rangeEnd.getTime())) {
      return NextResponse.json({ error: "Invalid to date." }, { status: 400 });
    }
    if (rangeStart && rangeEnd && rangeStart.getTime() > rangeEnd.getTime()) {
      return NextResponse.json(
        { error: "from must be on or before to." },
        { status: 400 }
      );
    }

    const startIso = rangeStart?.toISOString() ?? null;
    const endIso = rangeEnd?.toISOString() ?? null;

    const supabase = createAdminClient();

    let paymentsQuery = supabase
      .from("payments")
      .select("*");

    if (startIso) {
      paymentsQuery = paymentsQuery.gte("created_at", startIso);
    }
    if (endIso) {
      paymentsQuery = paymentsQuery.lte("created_at", endIso);
    }

    const { data: paymentsRaw, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      log.error("Sales movies payments query failed", paymentsError);
      return NextResponse.json({ error: "Failed to fetch sales data" }, { status: 500 });
    }

    const completedInPeriod = (paymentsRaw ?? [])
      .filter((row) => isPaymentCompleted(row as Record<string, unknown>))
      .map((row) => row as Record<string, unknown>);

    const { data: moviesList, error: moviesError } = await supabase
      .from("movies")
      .select("id, title");

    if (moviesError) {
      log.error("Sales movies list query failed", moviesError);
      return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
    }

    const ranked = rankMoviesBySalesCount(
      completedInPeriod,
      (moviesList ?? []) as { id: string; title: string | null }[]
    );

    const total = ranked.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * PAGE_SIZE;
    const items = ranked.slice(offset, offset + PAGE_SIZE);

    const body: MovieSalesListResponse = {
      items,
      pagination: {
        page: safePage,
        limit: PAGE_SIZE,
        total,
        totalPages,
      },
      rangeStart: startIso,
      rangeEnd: endIso,
    };

    return NextResponse.json(body);
  } catch (err) {
    log.error("Sales movies API error", err);
    return NextResponse.json({ error: "Failed to fetch movie sales" }, { status: 500 });
  }
}
