import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 不攔截：
     * - /api：公開 API（例如國考題庫）
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - sitemap.xml / robots.txt：搜尋引擎必須能直接讀取
     * - 圖片檔
     *
     * 這樣公開 API 與 SEO 基礎檔案不會被未登入檢查導去 /auth/login。
     */
    "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|sitemap\\.xml$|robots\\.txt$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
