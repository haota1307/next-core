import * as jwt from "jsonwebtoken";

import { prisma } from "@/lib/prisma";

const JWT_ACCESS_SECRET: string =
  process.env.JWT_ACCESS_SECRET || "dev_access_secret_change";
const JWT_REFRESH_SECRET: string =
  process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change";

export interface JwtPayloadCore {
  sub: string; // user id
  email: string;
  roles: string[];
  perms: string[]; // flattened permission strings subject:action
  type: "access" | "refresh";
}

export function signAccessToken(
  data: Omit<JwtPayloadCore, "type">,
  expiresIn: string | number = "15m"
) {
  return jwt.sign(
    { ...data, type: "access" },
    JWT_ACCESS_SECRET as jwt.Secret,
    { expiresIn } as jwt.SignOptions
  );
}

export function signRefreshToken(
  data: Omit<JwtPayloadCore, "type">,
  expiresIn: string | number = "7d"
) {
  return jwt.sign(
    { ...data, type: "refresh" },
    JWT_REFRESH_SECRET as jwt.Secret,
    { expiresIn } as jwt.SignOptions
  );
}

export function verifyAccessToken<T extends JwtPayloadCore>(
  token: string
): T | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as T;
  } catch {
    return null;
  }
}

export function verifyRefreshToken<T extends JwtPayloadCore>(
  token: string
): T | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as T;
  } catch {
    return null;
  }
}

export async function persistRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date,
  meta?: { ip?: string; userAgent?: string }
) {
  return prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  });
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date(), deletedAt: new Date() },
  });
}

export async function revokeUserRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), deletedAt: new Date() },
  });
}

// Verify refresh token cryptographically AND ensure it is still active in DB
export async function verifyActiveRefreshToken(token: string) {
  const decoded = verifyRefreshToken<JwtPayloadCore>(token);
  if (!decoded) return null;
  const record = await prisma.refreshToken.findFirst({
    where: {
      token,
      revokedAt: null,
      deletedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) return null;
  return decoded;
}
