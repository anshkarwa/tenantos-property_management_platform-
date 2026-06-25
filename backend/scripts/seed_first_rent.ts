import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const leases = await prisma.lease.findMany({
    include: { rent_collections: true }
  });

  for (const lease of leases) {
    if (lease.rent_collections.length === 0) {
      // Find token
      const app = await prisma.application.findFirst({
        where: { tenant_id: lease.tenant_id, unit_id: lease.unit_id }
      });
      const tokenPaid = app?.message?.includes('[TOKEN PAID]') ? 5000 : 0;
      const firstPaymentAmount = lease.monthly_rent + lease.security_deposit - tokenPaid;

      await prisma.rentCollection.create({
        data: {
          lease_id: lease.id,
          due_date: lease.start_date,
          amount_due: firstPaymentAmount,
          status: 'pending',
          notes: tokenPaid > 0 ? `Move-in Cost (Rent + Deposit) minus ₹${tokenPaid} Token` : 'Move-in Cost (Rent + Deposit)'
        }
      });
      console.log(`Created first rent collection for lease ${lease.id} amount ₹${firstPaymentAmount}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
