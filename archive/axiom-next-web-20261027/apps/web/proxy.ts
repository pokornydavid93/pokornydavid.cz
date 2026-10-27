import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routeForSiteMode, siteMode } from "./lib/site-mode-routes";

export function proxy(request: NextRequest) {
  const mode = siteMode(process.env.NEXT_PUBLIC_SITE_MODE);
  if (routeForSiteMode(mode, request.nextUrl.pathname) === "not-found") {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  const response = NextResponse.next();
  if (mode === "funnels" && /^p-[a-z2-7]{20}\.syllcode\.com$/u.test(request.nextUrl.hostname)) {
    response.headers.set("X-Robots-Tag", "noindex");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/).*)"],
};
