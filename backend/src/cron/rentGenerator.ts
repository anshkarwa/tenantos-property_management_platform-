import cron from 'node-cron';
import { prisma } from '../lib/prisma';

export function startCronJobs() {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Starting automated monthly rent generation...');
    try {
      await generateMonthlyRent();
    } catch (err) {
      console.error('[CRON] Error generating rent:', err);
    }
  });
  
  console.log('[CRON] Rent generator scheduled (runs daily at midnight).');
}

export async function generateMonthlyRent() {
  const activeLeases = await prisma.lease.findMany({
    where: { status: 'active', is_deleted: false },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let generatedCount = 0;

  for (const lease of activeLeases) {
    const dueDay = lease.rent_due_day;

    // Calculate the next due date based on the current month/year
    const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    
    // If nextDueDate has already passed today, it means the next actual due date is next month.
    // e.g. today is June 25th, dueDay is 1st. nextDueDate is currently June 1st. 
    // We want July 1st.
    if (nextDueDate < today) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    // Now calculate the difference in days
    const diffTime = nextDueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If it's exactly 7 days before due date (or up to 7 days before)
    if (diffDays <= 7 && diffDays >= 0) {
      // Check if an invoice already exists for this lease in the specific target month/year
      const monthStart = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), 1);
      const monthEnd = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 1);
      
      const existing = await prisma.rentCollection.findFirst({
        where: {
          lease_id: lease.id,
          due_date: {
            gte: monthStart,
            lt: monthEnd,
          }
        }
      });

      if (!existing) {
        // Create new invoice
        await prisma.rentCollection.create({
          data: {
            lease_id: lease.id,
            due_date: nextDueDate,
            amount_due: lease.monthly_rent,
            status: 'pending',
            notes: 'Monthly Rent',
          }
        });
        generatedCount++;
        console.log(`[CRON] Generated rent invoice for lease ${lease.id} due on ${nextDueDate.toISOString()}`);
      }
    }
  }

  console.log(`[CRON] Monthly rent generation complete. Created ${generatedCount} invoices.`);
}
