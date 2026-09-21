import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  const isPublicInfoRoute =
    pathname === "/about" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/feedback";

  const isPublicSeoRoute =
    pathname === "/medtech-exam" ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt";

  const isPublicApiRoute =
    pathname === "/api/health" ||
    pathname === "/api/payments/ecpay/return" ||
    pathname === "/api/feedback" ||
    pathname === "/api/beta-feedback" ||
    pathname.startsWith("/api/internal/");

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    isPublicInfoRoute ||
    isPublicSeoRoute ||
    isPublicApiRoute;

  if (!user && !isPublicRoute) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
