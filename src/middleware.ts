import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

// Define routes that require auth (prefix match)
const PROTECTED_PREFIXES = ["/api/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer "))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = auth.slice(7);
    const decoded = verifyAccessToken<any>(token);
    if (!decoded)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Optionally inject user context into headers
    const res = NextResponse.next();
    res.headers.set("x-user-id", decoded.sub);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
