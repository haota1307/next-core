import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = auth.slice(7);
    const decoded = verifyAccessToken<any>(token);
    
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json({
      user: {
        id: decoded.sub,
        email: decoded.email,
        roles: decoded.roles,
        permissions: decoded.perms,
      },
    });
  } catch (error) {
    console.error("Get user info error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
