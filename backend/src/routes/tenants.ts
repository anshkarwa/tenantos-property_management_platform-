import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateLandlord } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';

const createTenantSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/),
  email: z.string().email().optional(),
  aadhaar_number: z.string().optional(),
  aadhaar_verified: z.boolean().default(false),
  pan: z.string().optional(),
  profession: z.string().optional(),
  police_verification_status: z.enum(['not_started','pending','verified','rejected']).default('not_started'),
  id_proof_type: z.enum(['aadhaar','passport','voter_id','driving_license','pan']).optional(),
  whatsapp_opted_in: z.boolean().default(false),
  emergency_contact: z.object({
    name: z.string(),
    phone: z.string(),
    relation: z.string(),
  }).optional(),
  notes: z.string().optional(),
});

export async function tenantsRoutes(fastify: FastifyInstance) {

  // ── GET /api/tenants ───────────────────────────────────────────────────────
  fastify.get('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const query = request.query as { search?: string; status?: string };

    const tenants = await prisma.tenant.findMany({
      where: {
        is_deleted: false,
        OR: [
          { leases: { some: { unit: { property: { landlord_id: landlordId } } } } },
          { applications: { some: { landlord_id: landlordId } } }
        ],
        AND: query.search ? [
          {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ]
          }
        ] : undefined,
      },
      include: {
        leases: {
          where: { status: { in: ['active', 'notice'] }, is_deleted: false },
          include: { unit: { include: { property: { select: { name: true } } } } },
          take: 1,
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Enrich with current lease info
    const enriched = tenants.map(t => {
      const activeLease = t.leases[0] || null;
      return {
        ...t,
        unit: activeLease?.unit?.unit_number ?? null,
        property: activeLease?.unit?.property?.name ?? null,
        lease_status: activeLease?.status ?? 'no_lease',
        monthly_rent: activeLease?.monthly_rent ?? 0,
        leases: undefined,
      };
    });

    return reply.send(successResponse(enriched, { total: enriched.length }));
  });

  // ── POST /api/tenants ──────────────────────────────────────────────────────
  fastify.post('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const result = createTenantSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const existing = await prisma.tenant.findFirst({
      where: { phone: result.data.phone, is_deleted: false },
    });
    if (existing) {
      // If global tenant exists, just return it so landlord can create a lease
      return reply.status(200).send(successResponse(existing));
    }

    const tenant = await prisma.tenant.create({
      data: {
        ...result.data,
        auth: { create: {} },
      },
    });

    return reply.status(201).send(successResponse(tenant));
  });

  // ── GET /api/tenants/:id ───────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const tenant = await prisma.tenant.findFirst({
      where: { 
        id, 
        is_deleted: false,
        OR: [
          { leases: { some: { unit: { property: { landlord_id: landlordId } } } } },
          { applications: { some: { landlord_id: landlordId } } }
        ]
      },
      include: {
        leases: {
          where: { is_deleted: false },
          include: { unit: { include: { property: true } }, co_tenant_splits: true },
          orderBy: { created_at: 'desc' },
        },
        documents: true,
      },
    });

    if (!tenant) return reply.status(404).send(errorResponse(404, 'Tenant not found'));
    return reply.send(successResponse(tenant));
  });

  // ── PUT /api/tenants/:id ───────────────────────────────────────────────────
  fastify.put('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await prisma.tenant.findFirst({
      where: { 
        id, 
        is_deleted: false,
        OR: [
          { leases: { some: { unit: { property: { landlord_id: landlordId } } } } },
          { applications: { some: { landlord_id: landlordId } } }
        ]
      },
    });
    if (!existing) return reply.status(404).send(errorResponse(404, 'Tenant not found'));

    const result = createTenantSchema.partial().safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const updated = await prisma.tenant.update({ where: { id }, data: result.data });
    return reply.send(successResponse(updated));
  });

  // ── DELETE /api/tenants/:id ────────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await prisma.tenant.findFirst({
      where: { 
        id, 
        is_deleted: false,
        OR: [
          { leases: { some: { unit: { property: { landlord_id: landlordId } } } } },
          { applications: { some: { landlord_id: landlordId } } }
        ]
      },
    });
    if (!existing) return reply.status(404).send(errorResponse(404, 'Tenant not found'));

    await prisma.tenant.update({ where: { id }, data: { is_deleted: true } });
    return reply.send(successResponse({ message: 'Tenant deleted' }));
  });

  // ── POST /api/tenants/:id/verify-kyc ──────────────────────────────────────
  fastify.post('/:id/verify-kyc', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };
    const { aadhaar_verified, police_verification_status } = request.body as {
      aadhaar_verified?: boolean;
      police_verification_status?: string;
    };

    const existing = await prisma.tenant.findFirst({
      where: { 
        id, 
        is_deleted: false,
        OR: [
          { leases: { some: { unit: { property: { landlord_id: landlordId } } } } },
          { applications: { some: { landlord_id: landlordId } } }
        ]
      },
    });
    if (!existing) return reply.status(404).send(errorResponse(404, 'Tenant not found'));

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(aadhaar_verified !== undefined && { aadhaar_verified }),
        ...(police_verification_status && {
          police_verification_status: police_verification_status as any,
          ...(police_verification_status === 'verified' && {
            police_verification_date: new Date(),
          }),
        }),
      },
    });

    return reply.send(successResponse(updated));
  });
}
