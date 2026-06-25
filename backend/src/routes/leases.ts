import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateLandlord } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';

const createLeaseSchema = z.object({
  unit_id: z.string(),
  tenant_id: z.string(),
  start_date: z.string().transform(s => new Date(s)),
  end_date: z.string().transform(s => new Date(s)),
  monthly_rent: z.number().positive(),
  security_deposit: z.number().min(0).default(0),
  rent_due_day: z.number().int().min(1).max(28).default(1),
  state_template: z.string().optional(),
  annual_escalation_pct: z.number().min(0).default(0),
  notice_period_days: z.number().int().min(0).default(30),
  tds_applicable: z.boolean().default(false),
  agreement_clauses: z.array(z.string()).default([]),
  co_tenant_splits: z.array(z.object({
    name: z.string(),
    phone: z.string().optional(),
    share_pct: z.number(),
    amount: z.number(),
  })).default([]),
});

export async function leasesRoutes(fastify: FastifyInstance) {

  // ── GET /api/leases ────────────────────────────────────────────────────────
  fastify.get('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const query = request.query as { status?: string };

    const leases = await prisma.lease.findMany({
      where: {
        is_deleted: false,
        unit: { property: { landlord_id: landlordId } },
        ...(query.status && { status: query.status as any }),
      },
      include: {
        tenant: { select: { id: true, name: true, phone: true, email: true } },
        unit: {
          select: {
            id: true, unit_number: true, unit_type: true,
            property: { select: { id: true, name: true } },
          },
        },
        co_tenant_splits: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send(successResponse(leases, { total: leases.length }));
  });

  // ── POST /api/leases ───────────────────────────────────────────────────────
  fastify.post('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const result = createLeaseSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    // Verify unit belongs to this landlord
    const unit = await prisma.unit.findFirst({
      where: { id: result.data.unit_id, property: { landlord_id: landlordId }, is_deleted: false },
    });
    if (!unit) return reply.status(404).send(errorResponse(404, 'Unit not found'));

    if (unit.status === 'occupied') {
      return reply.status(409).send(errorResponse(409, 'Unit is already occupied'));
    }

    const { co_tenant_splits, ...leaseData } = result.data;

    const lease = await prisma.$transaction(async (tx) => {
      // Create lease
      const newLease = await tx.lease.create({
        data: {
          ...leaseData,
          status: 'active',
          co_tenant_splits: co_tenant_splits.length > 0
            ? { create: co_tenant_splits }
            : undefined,
        },
        include: { co_tenant_splits: true, tenant: true, unit: true },
      });

      // Mark unit as occupied
      await tx.unit.update({
        where: { id: result.data.unit_id },
        data: { status: 'occupied' },
      });

      // Check if token was paid
      const application = await tx.application.findFirst({
        where: { tenant_id: result.data.tenant_id, unit_id: result.data.unit_id }
      });
      const tokenPaid = application?.message?.includes('[TOKEN PAID]') ? 5000 : 0;
      const firstPaymentAmount = leaseData.monthly_rent + leaseData.security_deposit - tokenPaid;

      // Create first rent collection
      await tx.rentCollection.create({
        data: {
          lease_id: newLease.id,
          due_date: leaseData.start_date,
          amount_due: firstPaymentAmount,
          status: 'pending',
          notes: tokenPaid > 0 ? `Move-in Cost (Rent + Deposit) minus ₹${tokenPaid} Token` : 'Move-in Cost (Rent + Deposit)',
        }
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          landlord_id: landlordId,
          type: 'lease',
          message: `New lease created for ${newLease.tenant.name} - ${newLease.unit.unit_number}`,
          entity_id: newLease.id,
        },
      });

      return newLease;
    });

    return reply.status(201).send(successResponse(lease));
  });

  // ── GET /api/leases/:id ────────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const lease = await prisma.lease.findFirst({
      where: { id, is_deleted: false },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        co_tenant_splits: true,
        rent_collections: { orderBy: { due_date: 'desc' }, take: 12 },
      },
    });

    if (!lease) return reply.status(404).send(errorResponse(404, 'Lease not found'));
    return reply.send(successResponse(lease));
  });

  // ── PUT /api/leases/:id ────────────────────────────────────────────────────
  fastify.put('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const allowedUpdates = z.object({
      status: z.enum(['draft','active','notice','expired','terminated']).optional(),
      esign_status: z.enum(['pending','landlord_signed','tenant_signed','completed','rejected']).optional(),
      annual_escalation_pct: z.number().optional(),
      notice_period_days: z.number().optional(),
      agreement_pdf_url: z.string().url().optional(),
    });

    const result = allowedUpdates.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const updated = await prisma.lease.update({ where: { id }, data: result.data });
    return reply.send(successResponse(updated));
  });

  // ── POST /api/leases/:id/terminate ────────────────────────────────────────
  fastify.post('/:id/terminate', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };
    const { status = 'terminated' } = request.body as { status?: string };

    const lease = await prisma.lease.findFirst({
      where: { id, is_deleted: false },
      include: { tenant: true, unit: true },
    });
    if (!lease) return reply.status(404).send(errorResponse(404, 'Lease not found'));

    await prisma.$transaction(async (tx) => {
      await tx.lease.update({ where: { id }, data: { status: status as any } });
      await tx.unit.update({ where: { id: lease.unit_id }, data: { status: 'vacant' } });
      await tx.activityLog.create({
        data: {
          landlord_id: landlordId,
          type: 'lease',
          message: `Lease ${status} for ${lease.tenant.name} - ${lease.unit.unit_number}`,
          entity_id: id,
        },
      });
    });

    return reply.send(successResponse({ message: `Lease ${status} successfully` }));
  });
}
