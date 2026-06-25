import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateAdmin } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';

export async function adminRoutes(fastify: FastifyInstance) {

  // ── POST /api/admin/login ─────────────────────────────────────────────────────
  fastify.post('/login', async (request, reply) => {
    const schema = z.object({
      email:    z.string().email(),
      password: z.string().min(1),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { email, password } = result.data;
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return reply.status(401).send(errorResponse(401, 'Invalid credentials'));
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return reply.status(401).send(errorResponse(401, 'Invalid credentials'));
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data:  { last_login_at: new Date() },
    });

    const token = fastify.jwt.sign(
      { id: admin.id, role: 'admin' },
      { expiresIn: '4h' }
    );

    return reply.send(successResponse({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    }));
  });

  // ── All routes below require admin JWT ────────────────────────────────────────

  // ── GET /api/admin/stats ──────────────────────────────────────────────────────
  fastify.get('/stats', { preHandler: authenticateAdmin }, async (_req, reply) => {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        (SELECT count(*)::int FROM landlords) as total_landlords,
        (SELECT count(*)::int FROM landlords WHERE is_suspended = true) as suspended_landlords,
        (SELECT count(*)::int FROM tenants WHERE is_deleted = false) as total_tenants,
        (SELECT count(*)::int FROM tenants WHERE is_flagged = true) as flagged_tenants,
        (SELECT count(*)::int FROM properties WHERE is_deleted = false) as total_properties,
        (SELECT count(*)::int FROM units WHERE is_deleted = false) as total_units,
        (SELECT count(*)::int FROM units WHERE status = 'occupied' AND is_deleted = false) as occupied_units,
        (SELECT count(*)::int FROM leases WHERE status = 'active' AND is_deleted = false) as active_leases,
        (SELECT COALESCE(sum(amount_paid), 0)::float FROM rent_collections WHERE status = 'paid') as collected_revenue,
        (SELECT COALESCE(sum(amount_due), 0)::float FROM rent_collections WHERE status IN ('pending', 'overdue')) as pending_revenue,
        (SELECT count(*)::int FROM maintenance_requests WHERE status IN ('open', 'acknowledged', 'in_progress')) as open_maintenance
    `;

    const stats = rows[0];

    return reply.send(successResponse({
      landlords:        { total: stats.total_landlords, suspended: stats.suspended_landlords },
      tenants:          { total: stats.total_tenants, flagged: stats.flagged_tenants },
      properties:       { total: stats.total_properties },
      units:            { total: stats.total_units, occupied: stats.occupied_units, vacant: stats.total_units - stats.occupied_units },
      leases:           { active: stats.active_leases },
      revenue:          { collected: stats.collected_revenue, pending: stats.pending_revenue },
      maintenance:      { open: stats.open_maintenance },
    }));
  });

  // ── GET /api/admin/landlords ──────────────────────────────────────────────────
  fastify.get('/landlords', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { search, suspended } = request.query as { search?: string; suspended?: string };
    const landlords = await prisma.landlord.findMany({
      where: {
        ...(suspended === 'true' && { is_suspended: true }),
        ...(search && {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        kyc_status: true, subscription_tier: true,
        is_suspended: true, onboarding_done: true, created_at: true,
        _count: { select: { properties: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return reply.send(successResponse(landlords));
  });

  // ── PATCH /api/admin/landlords/:id/suspend ────────────────────────────────────
  fastify.patch('/landlords/:id/suspend', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const landlord = await prisma.landlord.update({
      where: { id },
      data:  { is_suspended: true },
      select: { id: true, name: true, is_suspended: true },
    });
    return reply.send(successResponse(landlord));
  });

  // ── PATCH /api/admin/landlords/:id/activate ───────────────────────────────────
  fastify.patch('/landlords/:id/activate', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const landlord = await prisma.landlord.update({
      where: { id },
      data:  { is_suspended: false },
      select: { id: true, name: true, is_suspended: true },
    });
    return reply.send(successResponse({ is_suspended: landlord.is_suspended }));
  });

  // ── PUT /api/admin/landlords/:id ──────────────────────────────────────────────
  fastify.put('/landlords/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      subscription_tier: z.string().optional(),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }
    const updated = await prisma.landlord.update({
      where: { id },
      data: result.data,
      select: { id: true, name: true, email: true, phone: true, subscription_tier: true },
    });
    return reply.send(successResponse(updated));
  });

  // ── DELETE /api/admin/landlords/:id ───────────────────────────────────────────
  fastify.delete('/landlords/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.landlord.delete({ where: { id } });
    return reply.send(successResponse({ deleted: true }));
  });

  // ── GET /api/admin/tenants ────────────────────────────────────────────────────
  fastify.get('/tenants', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { search, flagged } = request.query as { search?: string; flagged?: string };
    const tenants = await prisma.tenant.findMany({
      where: {
        is_deleted: false,
        ...(flagged === 'true' && { is_flagged: true }),
        ...(search && {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        aadhaar_verified: true, police_verification_status: true,
        membership_tier: true, is_flagged: true, created_at: true,
        _count: { select: { leases: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return reply.send(successResponse(tenants));
  });

  // ── PATCH /api/admin/tenants/:id/flag ────────────────────────────────────────
  fastify.patch('/tenants/:id/flag', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenant = await prisma.tenant.update({
      where: { id },
      data:  { is_flagged: true },
      select: { id: true, name: true, is_flagged: true },
    });
    return reply.send(successResponse(tenant));
  });

  // ── PATCH /api/admin/tenants/:id/unflag ──────────────────────────────────────
  fastify.patch('/tenants/:id/unflag', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenant = await prisma.tenant.update({
      where: { id },
      data:  { is_flagged: false },
      select: { id: true, name: true, is_flagged: true },
    });
    return reply.send(successResponse({ is_flagged: tenant.is_flagged }));
  });

  // ── PUT /api/admin/tenants/:id ────────────────────────────────────────────────
  fastify.put('/tenants/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional(),
      membership_tier: z.string().optional(),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }
    const updated = await prisma.tenant.update({
      where: { id },
      data: result.data,
      select: { id: true, name: true, email: true, phone: true, membership_tier: true },
    });
    return reply.send(successResponse(updated));
  });

  // ── DELETE /api/admin/tenants/:id ─────────────────────────────────────────────
  fastify.delete('/tenants/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.tenant.update({ where: { id }, data: { is_deleted: true } });
    return reply.send(successResponse({ deleted: true }));
  });

  // ── GET /api/admin/properties ─────────────────────────────────────────────────
  fastify.get('/properties', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { search, city } = request.query as { search?: string; city?: string };
    const properties = await prisma.property.findMany({
      where: {
        is_deleted: false,
        ...(city   && { city: { contains: city, mode: 'insensitive' } }),
        ...(search && {
          OR: [
            { name:    { contains: search, mode: 'insensitive' } },
            { city:    { contains: search, mode: 'insensitive' } },
            { pincode: { contains: search } },
          ],
        }),
      },
      select: {
        id: true, name: true, city: true, state: true, pincode: true,
        property_type: true, total_units: true, created_at: true,
        landlord: { select: { id: true, name: true, email: true } },
        _count: { select: { units: { where: { is_deleted: false } } } }
      },
      orderBy: { created_at: 'desc' },
    });
    return reply.send(successResponse(properties));
  });

  // ── PUT /api/admin/properties/:id ─────────────────────────────────────────────
  fastify.put('/properties/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      property_type: z.enum(['residential', 'commercial', 'pg', 'hostel']).optional(),
      total_units: z.number().int().min(1).optional(),
    });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }
    const updated = await prisma.property.update({
      where: { id },
      data: result.data,
      select: { id: true, name: true, city: true, state: true, pincode: true, property_type: true, total_units: true },
    });
    return reply.send(successResponse(updated));
  });

  // ── DELETE /api/admin/properties/:id ──────────────────────────────────────────
  fastify.delete('/properties/:id', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.property.update({ where: { id }, data: { is_deleted: true } });
    return reply.send(successResponse({ deleted: true }));
  });

  // ── GET /api/admin/leases ─────────────────────────────────────────────────────
  fastify.get('/leases', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    const leases = await prisma.lease.findMany({
      where: {
        is_deleted: false,
        ...(status && { status: status as any }),
      },
      select: {
        id: true, status: true, esign_status: true,
        monthly_rent: true, start_date: true, end_date: true, created_at: true,
        tenant: { select: { id: true, name: true, phone: true } },
        unit: {
          select: {
            unit_number: true,
            property: { select: { name: true, city: true, landlord: { select: { name: true } } } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    return reply.send(successResponse(leases));
  });

  // ── PATCH /api/admin/leases/:id/terminate ────────────────────────────────────
  fastify.patch('/leases/:id/terminate', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existingLease = await prisma.lease.findUnique({ where: { id }, select: { unit_id: true } });
    if (!existingLease) return reply.status(404).send(errorResponse(404, 'Lease not found'));

    const [lease] = await prisma.$transaction([
      prisma.lease.update({
        where: { id },
        data:  { status: 'terminated' },
        select: { id: true, status: true },
      }),
      prisma.unit.update({
        where: { id: existingLease.unit_id },
        data: { status: 'vacant' }
      }),
      prisma.rentCollection.deleteMany({
        where: { lease_id: id, status: 'pending' },
      })
    ]);

    return reply.send(successResponse(lease));
  });

  // ── GET /api/admin/payments ───────────────────────────────────────────────────
  fastify.get('/payments', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    const payments = await prisma.rentCollection.findMany({
      where: { ...(status && { status: status as any }) },
      select: {
        id: true, status: true, amount_due: true, amount_paid: true,
        due_date: true, paid_at: true, payment_method: true, upi_ref: true,
        receipt_number: true,
        lease: {
          select: {
            tenant: { select: { name: true, phone: true } },
            unit: {
              select: {
                unit_number: true,
                property: { select: { name: true, city: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 300,
    });
    return reply.send(successResponse(payments));
  });

  // ── GET /api/admin/maintenance ────────────────────────────────────────────────
  fastify.get('/maintenance', { preHandler: authenticateAdmin }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    const requests = await prisma.maintenanceRequest.findMany({
      where: { ...(status && { status: status as any }) },
      select: {
        id: true, title: true, category: true, priority: true,
        status: true, repair_cost: true, created_at: true, resolved_at: true,
        tenant: { select: { name: true, phone: true } },
        unit: {
          select: {
            unit_number: true,
            property: {
              select: {
                name: true, city: true,
                landlord: { select: { name: true } },
              },
            },
          },
        },
        vendor: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 300,
    });
    return reply.send(successResponse(requests));
  });
}
