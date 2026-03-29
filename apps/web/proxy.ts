import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const isProtected = request.nextUrl.pathname.startsWith("/app");
  const hasSession = request.cookies.get("nsm_session")?.value;

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
