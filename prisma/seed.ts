import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";

function randPassword(len = 14) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

async function ensurePermissions(subjects: string[], actions: string[]) {
  for (const subject of subjects) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { subject_action: { subject, action } },
        update: {},
        create: { subject, action },
      });
    }
  }
}

async function seedSettings() {
  const settings: { key: string; value: any; description?: string }[] = [
    { key: "site.name", value: "Next Core", description: "Tên website" },
    {
      key: "site.url",
      value: "http://localhost:3000",
      description: "Base URL",
    },
    { key: "mail.fromName", value: "NextCore", description: "Email From Name" },
    {
      key: "mail.fromEmail",
      value: "no-reply@example.com",
      description: "Email From Address",
    },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
}

async function seedEmailTemplates() {
  const templates = [
    {
      name: "password_reset",
      subject: "Reset your password",
      body: "Hello {{name}}, click here to reset your password: {{resetLink}}",
      placeholders: { name: "User name", resetLink: "Password reset URL" },
    },
    {
      name: "verify_email",
      subject: "Verify your email address",
      body: "Welcome {{name}}, verify your email: {{verifyLink}}",
      placeholders: { name: "User name", verifyLink: "Verification URL" },
    },
  ];
  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: t.name },
      update: {
        subject: t.subject,
        body: t.body,
        placeholders: t.placeholders,
      },
      create: t,
    });
  }
}

async function main() {
  const superEmail = process.env.SUPER_ADMIN_EMAIL;
  const superPassEnv = process.env.SUPER_ADMIN_PASSWORD;
  const superName = process.env.SUPER_ADMIN_NAME || "Super Administrator";
  if (!superEmail) throw new Error("Missing SUPER_ADMIN_EMAIL in env");

  const superPassword = superPassEnv || randPassword();
  const showGenerated = !superPassEnv;

  // Roles
  const roleSuper = await prisma.role.upsert({
    where: { name: "super_admin" },
    update: {},
    create: {
      name: "super_admin",
      description: "Super Administrator (full access)",
    },
  });
  const roleAdmin = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "System Administrator" },
  });
  const roleUser = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user", description: "Regular user" },
  });

  // Permissions (expand subjects & actions)
  const subjects = [
    "user",
    "role",
    "permission",
    "setting",
    "emailTemplate",
    "auditLog",
    "auth",
  ];
  const actions = ["read", "create", "update", "delete", "manage"];
  await ensurePermissions(subjects, actions);

  // Attach ALL perms to super_admin
  const allPerms = await prisma.permission.findMany({
    where: { deletedAt: null },
  });
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: roleSuper.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: roleSuper.id, permissionId: perm.id },
    });
  }

  // Provide a smaller subset to admin (exclude manage on auditLog & permission perhaps)
  for (const perm of allPerms.filter(
    (p: any) => !(p.subject === "auditLog" && p.action === "delete")
  )) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: roleAdmin.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: roleAdmin.id, permissionId: perm.id },
    });
  }

  // Super admin user
  let superUser = await prisma.user.findUnique({
    where: { email: superEmail },
  });
  if (!superUser) {
    superUser = await prisma.user.create({
      data: {
        email: superEmail,
        passwordHash: await hashPassword(superPassword),
        name: superName,
        emailVerified: new Date(),
      },
    });
  }
  for (const r of [roleSuper, roleAdmin, roleUser]) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: superUser.id, roleId: r.id } },
      update: {},
      create: { userId: superUser.id, roleId: r.id },
    });
  }

  // Sample normal user
  const sampleUserEmail = "user1@example.com";
  if (!(await prisma.user.findUnique({ where: { email: sampleUserEmail } }))) {
    const u = await prisma.user.create({
      data: {
        email: sampleUserEmail,
        passwordHash: await hashPassword("User123!"),
        name: "User One",
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: roleUser.id } },
      update: {},
      create: { userId: u.id, roleId: roleUser.id },
    });
  }

  await seedSettings();
  await seedEmailTemplates();

  console.log("Seed completed");
  if (showGenerated) {
    console.log("Generated SUPER_ADMIN_PASSWORD (save it now):", superPassword);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
