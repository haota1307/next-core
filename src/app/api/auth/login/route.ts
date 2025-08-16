import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { getUserRoleAndPermissions } from "@/lib/auth/rbac";
import {
  signAccessToken,
  signRefreshToken,
  persistRefreshToken,
} from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "User inactive" }, { status: 403 });
    }

    const { roles, permissions } = await getUserRoleAndPermissions(user.id);
    const base = { sub: user.id, email: user.email, roles, perms: permissions };
    const access = signAccessToken(base);
    const refresh = signRefreshToken(base, "7d");

    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await persistRefreshToken(user.id, refresh, expiresAt, {
      ip:
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const res = NextResponse.json({ 
      accessToken: access, 
      refreshToken: refresh,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions
      }
    });
    
    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
