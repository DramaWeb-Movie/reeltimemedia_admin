import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Upload not configured. Connect to R2 storage." },
    { status: 501 }
  );
}
