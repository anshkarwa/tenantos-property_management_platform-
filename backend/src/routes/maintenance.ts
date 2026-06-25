import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateLandlord } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';

const createMaintenanceSchema = z.object({
  unit_id: z.string(),
  tenant_id: z.string().optional(),
  category: z.enum(['plumbing','electrical','appliance','structural','pest','cleaning','carpentry','painting','other']),
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(['low','medium','high','urgent']).default('medium'),
});

const createVendorSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['plumbing','electrical','appliance','structural','pest','cleaning','carpentry','painting','other']),
  phone: z.string(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  verified: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function maintenanceRoutes(fastify: FastifyInstance) {

  // ── GET /api/maintenance ───────────────────────────────────────────────────
  fastify.get('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const query = request.query as { status?: string; category?: string; priority?: string };

    const requests = await prisma.maintenanceRequest.findMany({
      where: {
        unit: { property: { landlord_id: landlordId } },
        ...(query.status && { status: query.status as any }),
        ...(query.category && { category: query.category as any }),
        ...(query.priority && { priority: query.priority as any }),
      },
      include: {
        tenant: { select: { id: true, name: true, phone: true } },
        unit: {
          select: {
            unit_number: true,
            property: { select: { name: true } },
          },
        },
        vendor: { select: { id: true, name: true, phone: true, rating: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send(successResponse(requests, { total: requests.length }));
  });

  // ── POST /api/maintenance ──────────────────────────────────────────────────
  fastify.post('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const result = createMaintenanceSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const req = await prisma.$transaction(async (tx) => {
      const newReq = await tx.maintenanceRequest.create({
        data: { ...result.data, status: 'open' },
        include: {
          unit: { select: { unit_number: true } },
          tenant: { select: { name: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          landlord_id: landlordId,
          type: 'maintenance',
          message: `New request: ${newReq.title} (${newReq.unit.unit_number})`,
          entity_id: newReq.id,
        },
      });

      return newReq;
    });

    return reply.status(201).send(successResponse(req));
  });

  // ── GET /api/maintenance/:id ───────────────────────────────────────────────
  fastify.get('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const req = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        vendor: true,
      },
    });

    if (!req) return reply.status(404).send(errorResponse(404, 'Request not found'));
    return reply.send(successResponse(req));
  });

  // ── PUT /api/maintenance/:id ───────────────────────────────────────────────
  fastify.put('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const updateSchema = z.object({
      status: z.enum(['open','acknowledged','in_progress','resolved','closed','cancelled']).optional(),
      vendor_id: z.string().optional(),
      repair_cost: z.number().optional(),
      vendor_rating: z.number().int().min(1).max(5).optional(),
      priority: z.enum(['low','medium','high','urgent']).optional(),
    });

    const result = updateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { unit: { select: { unit_number: true } } },
    });
    if (!existing) return reply.status(404).send(errorResponse(404, 'Request not found'));

    const updateData: any = { ...result.data };
    if (result.data.status === 'acknowledged' && !existing.acknowledged_at) {
      updateData.acknowledged_at = new Date();
    }
    if (result.data.status === 'resolved' && !existing.resolved_at) {
      updateData.resolved_at = new Date();
    }

    const updated = await prisma.maintenanceRequest.update({ where: { id }, data: updateData });

    // Log vendor assignment
    if (result.data.vendor_id) {
      const vendor = await prisma.vendor.findUnique({ where: { id: result.data.vendor_id } });
      if (vendor) {
        await prisma.activityLog.create({
          data: {
            landlord_id: landlordId,
            type: 'maintenance',
            message: `Vendor ${vendor.name} assigned to: ${existing.title} (${existing.unit.unit_number})`,
            entity_id: id,
          },
        });
        // Update vendor job count
        await prisma.vendor.update({
          where: { id: vendor.id },
          data: { total_jobs: { increment: 1 } },
        });
      }
    }

    // Log resolution
    if (result.data.status === 'resolved' && existing.status !== 'resolved') {
      await prisma.activityLog.create({
        data: {
          landlord_id: landlordId,
          type: 'maintenance',
          message: `Request resolved: ${existing.title} (Property ${existing.unit.unit_number.replace('Unit ', '')})`,
          entity_id: id,
        },
      });
    }

    return reply.send(successResponse(updated));
  });

  // ── GET /api/maintenance/vendors ──────────────────────────────────────────
  fastify.get('/vendors/list', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const query = request.query as { category?: string };

    const vendors = await prisma.vendor.findMany({
      where: {
        landlord_id: landlordId,
        is_deleted: false,
        ...(query.category && { category: query.category as any }),
      },
      orderBy: [{ verified: 'desc' }, { rating: 'desc' }],
    });

    return reply.send(successResponse(vendors, { total: vendors.length }));
  });

  // ── POST /api/maintenance/vendors ─────────────────────────────────────────
  fastify.post('/vendors', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const result = createVendorSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const vendor = await prisma.vendor.create({
      data: { ...result.data, landlord_id: landlordId },
    });

    return reply.status(201).send(successResponse(vendor));
  });

  // ── DELETE /api/maintenance/:id ──────────────────────────────────────────
  fastify.delete('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id },
    });
    if (!existing) return reply.status(404).send(errorResponse(404, 'Request not found'));

    await prisma.maintenanceRequest.delete({ where: { id } });
    return reply.send(successResponse({ deleted: true }));
  });
}
