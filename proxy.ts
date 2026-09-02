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
     * - 圖片檔
     *
     * 這樣 /api/national-exam 不會被未登入檢查導去 /auth/login。
     */
    "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
