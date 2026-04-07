import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PIN_COOKIE = "reeltime-admin-pin";
const protectedPaths = ["/overview", "/movies", "/sales", "/payments", "/plans", "/upload", "/users"];
const authPaths = ["/login"];
const pinPath = "/pin";

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isAuthPath(pathname: string): boolean {
  return authPaths.some((p) => pathname.startsWith(p));
}

function hasPinCookie(request: NextRequest): boolean {
  return request.cookies.get(PIN_COOKIE)?.value === "verified";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname } = request.nextUrl;

  // Allow static files and API routes
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return supabaseResponse;
  }

  // Redirect authenticated users away from login and pin
  if ((isAuthPath(pathname) || pathname === pinPath) && user) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  // /login requires PIN cookie first – redirect to PIN if not verified
  if (pathname === "/login" && !user && !hasPinCookie(request)) {
    const pinUrl = new URL(pinPath, request.url);
    // Preserve redirect param (e.g. /login?redirect=/movies -> pin redirects back to /login?redirect=/movies)
    pinUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(pinUrl);
  }

  // Redirect unauthenticated users to login for protected paths (login will redirect to pin if needed)
  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
