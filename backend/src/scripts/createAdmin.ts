/**
 * TenantOS — Create Admin Script
 * Run: npx ts-node src/scripts/createAdmin.ts
 *
 * Creates the first admin account in the database.
 * Change the credentials below before running.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_NAME  = 'Super Admin';
const ADMIN_EMAIL = 'admin@tenantos.in';
const ADMIN_PASS  = 'admin@tenantos2026'; // Change this!

async function main() {
  const hash = await bcrypt.hash(ADMIN_PASS, 12);
  const existing = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    await prisma.admin.update({ where: { email: ADMIN_EMAIL }, data: { password_hash: hash } });
    console.log(`\n🔐 Admin password updated!`);
  } else {
    await prisma.admin.create({ data: { name: ADMIN_NAME, email: ADMIN_EMAIL, password_hash: hash } });
    console.log(`\n🔐 Admin created successfully!`);
  }

  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASS}`);
  console.log(`   URL     : /console\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
