import { prisma } from "../prisma";

export async function getUserRoleAndPermissions(userId: string) {
  const roles: any[] = await prisma.userRole.findMany({
    where: { userId, deletedAt: null },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  const roleNames = roles.map((r: any) => r.role.name);
  const permissions = new Set<string>();
  roles.forEach((r: any) => {
    r.role.permissions.forEach((rp: any) => {
      if (!rp.deletedAt && !rp.permission.deletedAt)
        permissions.add(`${rp.permission.subject}:${rp.permission.action}`);
    });
  });
  return { roles: roleNames, permissions: Array.from(permissions) };
}

export function hasPermission(
  perms: string[] | Set<string>,
  subject: string,
  action: string
) {
  const key = `${subject}:${action}`;
  if (perms instanceof Set) return perms.has(key);
  return perms.includes(key);
}

export function hasAnyPermission(
  perms: string[] | Set<string>,
  checks: { subject: string; action: string }[]
) {
  return checks.some((c) => hasPermission(perms, c.subject, c.action));
}

export function hasAllPermissions(
  perms: string[] | Set<string>,
  checks: { subject: string; action: string }[]
) {
  return checks.every((c) => hasPermission(perms, c.subject, c.action));
}
