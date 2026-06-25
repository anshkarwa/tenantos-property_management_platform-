import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateLandlord } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_invalid',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret',
});

const recordPaymentSchema = z.object({
  lease_id: z.string(),
  due_date: z.string().transform(s => new Date(s)),
  amount_due: z.number().positive(),
  amount_paid: z.number().min(0),
  payment_method: z.enum(['upi','neft','rtgs','imps','cash','cheque','card']).optional(),
  upi_ref: z.string().optional(),
  late_fee_applied: z.number().default(0),
  tds_deducted: z.number().default(0),
  gst_amount: z.number().default(0),
  notes: z.string().optional(),
});

// Generate receipt number: RC-YYYY-XXXXXXXX
async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.rentCollection.count();
  const padded = String(count + 1).padStart(8, '0');
  return `RC-${year}-${padded}`;
}

export async function rentRoutes(fastify: FastifyInstance) {

  // ── GET /api/rent ──────────────────────────────────────────────────────────
  fastify.get('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const query = request.query as { status?: string; month?: string; lease_id?: string };

    // Parse month filter (format: YYYY-MM)
    let dateFilter = {};
    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      dateFilter = {
        due_date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      };
    }

    const collections = await prisma.rentCollection.findMany({
      where: {
        lease: { unit: { property: { landlord_id: landlordId } } },
        ...(query.status && { status: query.status as any }),
        ...(query.lease_id && { lease_id: query.lease_id }),
        ...dateFilter,
      },
      include: {
        lease: {
          select: {
            id: true, monthly_rent: true,
            tenant: { select: { id: true, name: true, phone: true } },
            unit: {
              select: {
                unit_number: true,
                property: { select: { name: true } },
              },
            },
          },
        },
        co_tenant_payments: true,
      },
      orderBy: { due_date: 'desc' },
    });

    return reply.send(successResponse(collections, { total: collections.length }));
  });

  // ── POST /api/rent/record ──────────────────────────────────────────────────
  fastify.post('/record', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const result = recordPaymentSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { amount_due, amount_paid } = result.data;
    const status = amount_paid >= amount_due ? 'paid'
      : amount_paid > 0 ? 'pending'
      : 'pending';

    const receiptNumber = amount_paid >= amount_due ? await generateReceiptNumber() : null;

    const collection = await prisma.$transaction(async (tx) => {
      const newCollection = await tx.rentCollection.create({
        data: {
          ...result.data,
          status: status as any,
          receipt_number: receiptNumber,
          paid_at: amount_paid > 0 ? new Date() : null,
        },
        include: {
          lease: {
            include: {
              tenant: { select: { name: true } },
              unit: { select: { unit_number: true } },
            },
          },
        },
      });

      if (amount_paid > 0) {
        await tx.activityLog.create({
          data: {
            landlord_id: landlordId,
            type: 'payment',
            message: `${newCollection.lease.tenant.name} paid ₹${amount_paid.toLocaleString('en-IN')} for ${newCollection.lease.unit.unit_number}`,
            entity_id: newCollection.id,
          },
        });
      }

      return newCollection;
    });

    return reply.status(201).send(successResponse(collection));
  });

  // ── PUT /api/rent/:id ──────────────────────────────────────────────────────
  fastify.put('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateSchema = z.object({
      amount_paid: z.number().optional(),
      status: z.enum(['pending','paid','overdue','late','waived']).optional(),
      payment_method: z.enum(['upi','neft','rtgs','imps','cash','cheque','card']).optional(),
      upi_ref: z.string().optional(),
      notes: z.string().optional(),
    });

    const result = updateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const existing = await prisma.rentCollection.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send(errorResponse(404, 'Record not found'));

    // Auto-generate receipt if marking as paid
    const updateData: any = { ...result.data };
    if (result.data.status === 'paid' && !existing.receipt_number) {
      updateData.receipt_number = await generateReceiptNumber();
      updateData.paid_at = new Date();
    }

    const updated = await prisma.rentCollection.update({ where: { id }, data: updateData });
    return reply.send(successResponse(updated));
  });

  // ── POST /api/rent/create-order ─────────────────────────────────────────────
  fastify.post('/create-order', { preHandler: authenticateLandlord }, async (request, reply) => {
    // Note: We use authenticateLandlord here if landlord is creating it, or we need a tenant route.
    // Oh wait, the payment flow is for the TENANT paying the landlord.
    // BUT our rentRoutes is currently protected by `authenticateLandlord`?
    // Let me check if authenticateLandlord is used everywhere.
    // We should probably allow the tenant to create the order.
    // Wait, let's look at the current endpoints first.
    return reply.status(501).send(errorResponse(501, 'To be implemented shortly'));
  });

  // ── GET /api/rent/summary ──────────────────────────────────────────────────
  fastify.get('/summary', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const collections = await prisma.rentCollection.findMany({
      where: {
        lease: { unit: { property: { landlord_id: landlordId } } },
        due_date: { gte: startOfMonth, lt: endOfMonth },
      },
    });

    const total_due = collections.reduce((s, c) => s + c.amount_due, 0);
    const total_collected = collections.reduce((s, c) => s + c.amount_paid, 0);
    const overdue_count = collections.filter(c => c.status === 'overdue' || c.status === 'pending').length;
    const overdue_amount = collections
      .filter(c => c.status === 'overdue' || c.status === 'pending')
      .reduce((s, c) => s + (c.amount_due - c.amount_paid), 0);

    return reply.send(successResponse({
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      total_due,
      total_collected,
      collection_rate: total_due > 0 ? Math.round((total_collected / total_due) * 100) : 0,
      overdue_count,
      overdue_amount,
    }));
  });
}
