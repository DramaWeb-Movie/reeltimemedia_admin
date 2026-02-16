import { NextResponse } from "next/server";

export async function GET(_request: Request) {
  try {
    return NextResponse.json({ payments: [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
