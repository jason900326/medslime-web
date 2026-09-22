import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function safeNext(value: string | null) {
  const next = value?.trim() ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.redirect(
      new URL(
        "/auth/error?error=" +
          encodeURIComponent("本機缺少 Supabase 環境變數，請檢查 .env.local。"),
        request.url,
      ),
    );
  }

  const pendingCookies: CookieToSet[] = [];
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const redirectTo = new URL("/auth/callback", request.url);
  redirectTo.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(
        "/auth/error?error=" +
          encodeURIComponent(error?.message || "無法取得 Google 登入網址。"),
        request.url,
      ),
    );
  }

  const response = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
