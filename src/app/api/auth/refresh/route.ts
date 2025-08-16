import { NextRequest, NextResponse } from "next/server";
import {
  verifyActiveRefreshToken,
  signAccessToken,
  signRefreshToken,
  persistRefreshToken,
} from "@/lib/auth/jwt";
import { getUserRoleAndPermissions } from "@/lib/auth/rbac";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Missing refresh token" },
        { status: 400 }
      );
    }
    
    const decoded = await verifyActiveRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    const { sub, email } = decoded;
    const { roles, permissions } = await getUserRoleAndPermissions(sub);
    const base = { sub, email, roles, perms: permissions };
    const access = signAccessToken(base);
    const newRefresh = signRefreshToken(base, "7d");
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    
    await persistRefreshToken(sub, newRefresh, expiresAt, {
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ 
      accessToken: access, 
      refreshToken: newRefresh 
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
