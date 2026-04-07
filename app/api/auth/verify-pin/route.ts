import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const PIN_COOKIE = "reeltime-admin-pin";
const PIN_MAX_AGE = 60 * 60; // 1 hour

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const attempts = new Map<string, { count: number; resetAt: number }>();

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function pruneAttempts(now: number): void {
  for (const [key, value] of attempts.entries()) {
    if (now > value.resetAt) {
      attempts.delete(key);
    }
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  pruneAttempts(now);
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

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

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 }
      );
    }

    if (!safeEqual(pin, expectedPin)) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    clearAttempts(ip);
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
