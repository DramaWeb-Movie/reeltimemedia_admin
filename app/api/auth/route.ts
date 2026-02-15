import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE = "reeltime-admin-session";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  return NextResponse.json({
    authenticated: session?.value === "authenticated",
  });
}
