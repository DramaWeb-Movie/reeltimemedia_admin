import { NextRequest, NextResponse } from "next/server";

const PIN_COOKIE = "reeltime-admin-pin";
const PIN_MAX_AGE = 60 * 60; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pin = (body.pin as string)?.trim();

    const expectedPin = process.env.ADMIN_PIN;

    if (!expectedPin) {
      return NextResponse.json(
        { error: "PIN authentication is not configured" },
        { status: 500 }
      );
    }

    if (!pin) {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }

    if (pin !== expectedPin) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(PIN_COOKIE, "verified", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: PIN_MAX_AGE,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to verify PIN" },
      { status: 500 }
    );
  }
}
