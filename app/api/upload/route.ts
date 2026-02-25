import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(
    { error: "Upload not configured. Connect to R2 storage." },
    { status: 501 }
  );
}
