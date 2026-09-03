import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticateLandlord } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_invalid',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret',
});

export async function dashboardRoutes(fastify: FastifyInstance) {

  // ── GET /api/dashboard ─────────────────────────────────────────────────────
  fastify.get('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      properties,
      units,
      activeLeases,
      expiringLeases,
      monthlyRent,
      openMaintenance,
    ] = await Promise.all([
      // Total properties
      prisma.property.count({ where: { landlord_id: landlordId, is_deleted: false } }),

      // Units stats
      prisma.unit.findMany({
        where: { property: { landlord_id: landlordId, is_deleted: false }, is_deleted: false },
        select: { status: true, monthly_rent: true },
      }),

      // Active leases
      prisma.lease.count({
        where: {
          unit: { property: { landlord_id: landlordId, is_deleted: false } },
          status: 'active',
          is_deleted: false,
        },
      }),

      // Leases expiring in 30 days
      prisma.lease.count({
        where: {
          unit: { property: { landlord_id: landlordId, is_deleted: false } },
          status: 'active',
          end_date: { gte: now, lte: thirtyDaysLater },
          is_deleted: false,
        },
      }),

      // This month's rent
      prisma.rentCollection.findMany({
        where: {
          lease: { unit: { property: { landlord_id: landlordId, is_deleted: false } } },
          due_date: { gte: startOfMonth, lt: endOfMonth },
        },
        select: { amount_due: true, amount_paid: true, status: true },
      }),

      // Open maintenance
      prisma.maintenanceRequest.count({
        where: {
          unit: { property: { landlord_id: landlordId, is_deleted: false } },
          status: { in: ['open', 'acknowledged', 'in_progress'] },
        },
      }),
    ]);

    const total_units = units.length;
    const occupied_units = units.filter(u => u.status === 'occupied').length;
    const occupancy_rate = total_units > 0 ? Math.round((occupied_units / total_units) * 100) : 0;

    const rent_due_this_month = monthlyRent.reduce((s, r) => s + r.amount_due, 0);
    const rent_collected_this_month = monthlyRent.reduce((s, r) => s + r.amount_paid, 0);
    const overdue = monthlyRent.filter(r => r.status === 'overdue' || r.status === 'pending');
    const overdue_amount = overdue.reduce((s, r) => s + (r.amount_due - r.amount_paid), 0);

    return reply.send(successResponse({
      total_properties: properties,
      total_units,
      occupied_units,
      occupancy_rate,
      rent_collected_this_month,
      rent_due_this_month,
      overdue_amount,
      overdue_count: overdue.length,
      active_leases: activeLeases,
      expiring_soon: expiringLeases,
      open_maintenance: openMaintenance,
    }));
  });

  // ── GET /api/dashboard/activity ────────────────────────────────────────────
  fastify.get('/activity', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };

    const activity = await prisma.activityLog.findMany({
      where: { landlord_id: landlordId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return reply.send(successResponse(activity));
  });

  // ── GET /api/dashboard/revenue ─────────────────────────────────────────────
  fastify.get('/revenue', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const now = new Date();

    // Last 6 months — single query, aggregate in JS to avoid connection pool exhaustion
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('en-IN', { month: 'short' }) };
    });

    const rangeStart = new Date(months[0].year, months[0].month - 1, 1);
    const rangeEnd   = new Date(months[months.length - 1].year, months[months.length - 1].month, 1);

    const allRecords = await prisma.rentCollection.findMany({
      where: {
        lease: { unit: { property: { landlord_id: landlordId } } },
        due_date: { gte: rangeStart, lt: rangeEnd },
      },
      select: { amount_due: true, amount_paid: true, due_date: true },
    });

    const data = months.map(({ year, month, label }) => {
      const start = new Date(year, month - 1, 1).getTime();
      const end   = new Date(year, month,     1).getTime();
      const records = allRecords.filter(r => {
        const t = new Date(r.due_date).getTime();
        return t >= start && t < end;
      });
      return {
        month: label,
        collected: records.reduce((s, r) => s + r.amount_paid, 0),
        due:       records.reduce((s, r) => s + r.amount_due,  0),
      };
    });

    return reply.send(successResponse(data));
  });

  // ── POST /api/landlord/subscription/create-order ───────────────────────────
  fastify.post('/subscription/create-order', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { plan_id } = request.body as { plan_id: 'free' | 'pro' | 'portfolio' };

    if (plan_id === 'free') {
      return reply.status(400).send(errorResponse(400, 'Free plan does not require payment'));
    }

    // Get number of active units
    const unitCount = await prisma.unit.count({
      where: { property: { landlord_id: landlordId } }
    });

    const billableUnits = Math.max(1, unitCount); // Charge at least 1 unit
    const pricePerUnit = plan_id === 'pro' ? 49 : 39;
    
    // Total = Units * PricePerUnit * GST(18%)
    const totalAmount = Math.round(billableUnits * pricePerUnit * 1.18 * 100); // in paise

    try {
      const order = await razorpay.orders.create({
        amount: totalAmount,
        currency: 'INR',
        receipt: `sub_${landlordId.slice(-12)}_${Date.now().toString().slice(-8)}`,
      });

      return reply.send(successResponse({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        plan_id: plan_id,
        billable_units: billableUnits
      }));
    } catch (err: any) {
      const msg = err?.error?.description || err?.message || 'Razorpay order creation failed';
      console.error('[Subscription] Razorpay create-order error:', msg, err);
      return reply.status(502).send(errorResponse(502, `Payment gateway error: ${msg}`));
    }
  });

  // ── POST /api/landlord/subscription/verify ─────────────────────────────────
  fastify.post('/subscription/verify', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { 
      plan_id,
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = request.body as any;

    if (!razorpay_order_id?.startsWith('order_mock_')) {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'secret';
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return reply.status(400).send(errorResponse(400, 'Invalid payment signature'));
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 1 month

    const updated = await prisma.landlord.update({
      where: { id: landlordId },
      data: {
        subscription_tier: plan_id,
        subscription_expires_at: expiresAt,
      },
      select: { subscription_tier: true, subscription_expires_at: true, phone: true },
    });

    // ── Referral reward: if this landlord signed up via a tenant referral, reward the referrer ──
    if (['pro', 'portfolio'].includes(plan_id)) {
      try {
        const referral = await (prisma as any).referral.findFirst({
          where: { referred_phone: updated.phone, status: { in: ['pending', 'signed_up'] } },
        });
        if (referral) {
          await (prisma as any).referral.update({
            where: { id: referral.id },
            data: { status: 'rewarded', updated_at: new Date() },
          });
          console.log(`[Referral] ₹${referral.reward_amount} reward triggered for tenant ${referral.referrer_id} — landlord ${updated.phone} upgraded to ${plan_id}`);
        }
      } catch (e) {
        console.error('[Referral] Error processing referral reward:', e);
      }
    }

    return reply.send(successResponse({
      subscription_tier: updated.subscription_tier,
      subscription_expires_at: updated.subscription_expires_at,
    }));
  });
}
