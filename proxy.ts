import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 不攔截：
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - sitemap.xml / robots.txt：搜尋引擎必須能直接讀取
     * - 圖片檔
     *
     * API 會進入登入檢查；只有 lib/supabase/proxy.ts 明確列出的 callback / health / internal 端點例外。
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml$|robots\\.txt$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
