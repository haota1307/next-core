import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json();
  if (refreshToken) {
    await revokeRefreshToken(refreshToken).catch(() => {});
  }
  return NextResponse.json({ success: true });
}
