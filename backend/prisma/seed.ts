// TenantOS — Database Seed Script
// Populates DB with realistic Indian rental data for development
// Run: npm run prisma:seed

import { PrismaClient, PropertyType, UnitStatus, Furnishing, KycStatus,
  LeaseStatus, EsignStatus, RentStatus, PaymentMethod,
  MaintenanceCategory, MaintenancePriority, MaintenanceStatus,
  PoliceVerificationStatus, ActivityType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TenantOS database...\n');

  // ── Clean slate ─────────────────────────────────────────────────────────────
  await prisma.activityLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.coTenantPayment.deleteMany();
  await prisma.rentCollection.deleteMany();
  await prisma.coTenantSplit.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.document.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.tenantAuth.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.landlordAuth.deleteMany();
  await prisma.landlord.deleteMany();
  console.log('  ✓ Cleared existing data');

  // ── Landlord ─────────────────────────────────────────────────────────────────
  const landlord = await prisma.landlord.create({
    data: {
      id: 'l-001',
      name: 'Ansh Karwa',
      phone: '+919892735234',
      email: 'anshk@gmail.com',
      pan: 'ABCPS1234A',
      gstin: '29ABCPS1234A1ZK',
      kyc_status: KycStatus.verified,
      preferred_lang: 'en',
      onboarding_done: true,
      hra_eligible: true,
      bank_account: { name: 'Ansh Karwa', ifsc: 'HDFC0001234', account_number: '50100012345678', bank: 'HDFC Bank' },
      upi_id: 'ansh.karwa@hdfcbank',
    },
  });

  await prisma.landlordAuth.create({
    data: {
      landlord_id: landlord.id,
      password_hash: await bcrypt.hash('password123', 10), // default dev password
    },
  });
  console.log('  ✓ Created landlord: Ansh Karwa (email: anshk@gmail.com, password: password123)');

  console.log('\n✅ Seed complete! Database is ready with just 1 Landlord.\n');
  console.log('  📧 Landlord login: anshk@gmail.com / password123\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
