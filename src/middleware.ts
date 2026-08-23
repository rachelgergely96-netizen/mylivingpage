import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isAdminEmail } from "@/lib/admin";
import { isEditorPreviewEnabled } from "@/lib/editor-preview";

const PROTECTED_PATHS = ["/create", "/dashboard", "/admin"];
const ADMIN_PATHS = ["/admin"];
const LOCAL_PREVIEW_PATHS = new Set([
  "/dev/ats-preview",
  "/dev/admin-preview",
  "/dev/dashboard-preview",
  "/dev/editor-preview",
  "/dev/public-action-preview",
  "/dev/theme-lab",
]);

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (LOCAL_PREVIEW_PATHS.has(pathname)) {
    return isEditorPreviewEnabled()
      ? NextResponse.next()
      : new NextResponse(null, { status: 404 });
  }

  const { response, userId, userEmail } = await updateSession(request);

  if (isProtectedPath(pathname) && !userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath(pathname) && !isAdminEmail(userEmail)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
