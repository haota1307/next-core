import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (refreshToken) {
      await revokeRefreshToken(refreshToken).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: true }); // Always return success for logout
  }
}
