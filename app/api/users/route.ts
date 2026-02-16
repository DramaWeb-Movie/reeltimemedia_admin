import { NextResponse } from "next/server";

export async function GET(_request: Request) {
  try {
    return NextResponse.json({ users: [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
