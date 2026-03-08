import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: [
    // Exclude static files, images, and upload API routes (large file uploads)
    "/((?!_next/static|_next/image|favicon.ico|images|api/movies/upload|api/upload).*)",
  ],
};
