import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateLandlord } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';

const createPropertySchema = z.object({
  name: z.string().min(2),
  address_line1: z.string().min(5),
  address_line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  property_type: z.enum(['residential', 'commercial', 'pg', 'hostel']).default('residential'),
  total_units: z.number().int().min(1).default(1),
  gst_applicable: z.boolean().default(false),
  gst_rate: z.number().default(0),
  amenities: z.record(z.boolean()).optional(),
});


const unitBaseObject = z.object({
  unit_number: z.string().min(1),
  unit_type: z.string().min(1),
  floor: z.number().int().default(0),
  area_sqft: z.number().optional(),
  monthly_rent: z.number().positive(),
  security_deposit: z.number().min(0).default(0),
  status: z.enum(['occupied', 'vacant', 'under_maintenance']).default('vacant'),
  furnishing: z.enum(['furnished', 'semi', 'unfurnished']).default('unfurnished'),
  amenities: z.record(z.boolean()).optional(),
  is_published: z.boolean().optional(),
  description: z.string().optional(),
  preferred_tenant: z.array(z.string()).optional(),
  preferred_tenants: z.array(z.string()).optional(),
  available_from: z.coerce.date().optional(),
  photo_urls: z.array(z.string()).optional(),
});

const normalizeUnitData = (data: any) => {
  const preferred = data.preferred_tenant || data.preferred_tenants;
  const { preferred_tenants, ...rest } = data;
  return {
    ...rest,
    ...(preferred && { preferred_tenant: preferred }),
  };
};

const createUnitSchema = unitBaseObject.transform(normalizeUnitData);
const updateUnitSchema = unitBaseObject.partial().transform(normalizeUnitData);

export async function propertiesRoutes(fastify: FastifyInstance) {

  // ── GET /api/properties ────────────────────────────────────────────────────
  fastify.get('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };

    const properties = await prisma.property.findMany({
      where: { landlord_id: landlordId, is_deleted: false },
      include: {
        units: {
          where: { is_deleted: false },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Compute occupied_units count
    const enriched = (properties as any[]).map(p => ({
      ...p,
      occupied_units: p.units.filter((u: any) => u.status === 'occupied').length,
    }));

    return reply.send(successResponse(enriched, { total: enriched.length }));
  });

  // ── POST /api/properties ───────────────────────────────────────────────────
  fastify.post('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const result = createPropertySchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const property = await prisma.property.create({
      data: { ...result.data, landlord_id: landlordId },
    });

    return reply.status(201).send(successResponse(property));
  });

  // ── GET /api/properties/:id ────────────────────────────────────────────────
  fastify.get('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const property = await prisma.property.findFirst({
      where: { id, landlord_id: landlordId, is_deleted: false },
      include: {
        units: { where: { is_deleted: false }, orderBy: { unit_number: 'asc' } },
      },
    });

    if (!property) return reply.status(404).send(errorResponse(404, 'Property not found'));
    return reply.send(successResponse(property));
  });

  // ── PUT /api/properties/:id ────────────────────────────────────────────────
  fastify.put('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await prisma.property.findFirst({
      where: { id, landlord_id: landlordId, is_deleted: false },
    });
    if (!existing) return reply.status(404).send(errorResponse(404, 'Property not found'));

    const result = createPropertySchema.partial().safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const updated = await prisma.property.update({ where: { id }, data: result.data });
    return reply.send(successResponse(updated));
  });

  // ── DELETE /api/properties/:id ─────────────────────────────────────────────
  fastify.delete('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const existing = await prisma.property.findFirst({
      where: { id, landlord_id: landlordId, is_deleted: false },
    });
    if (!existing) return reply.status(404).send(errorResponse(404, 'Property not found'));

    await prisma.property.update({ where: { id }, data: { is_deleted: true } });
    return reply.send(successResponse({ message: 'Property deleted' }));
  });

  // ── GET /api/properties/:id/units ─────────────────────────────────────────
  fastify.get('/:id/units', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id: propertyId } = request.params as { id: string };

    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlord_id: landlordId, is_deleted: false },
    });
    if (!property) return reply.status(404).send(errorResponse(404, 'Property not found'));

    const units = await prisma.unit.findMany({
      where: { property_id: propertyId, is_deleted: false },
      orderBy: { unit_number: 'asc' },
    });
    return reply.send(successResponse(units, { total: units.length }));
  });

  // ── POST /api/properties/:id/units ────────────────────────────────────────
  fastify.post('/:id/units', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id: propertyId } = request.params as { id: string };

    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlord_id: landlordId, is_deleted: false },
    });
    if (!property) return reply.status(404).send(errorResponse(404, 'Property not found'));

    const result = createUnitSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const unit = await prisma.unit.create({
      data: { ...result.data, property_id: propertyId },
    });
    return reply.status(201).send(successResponse(unit));
  });

  // ── PUT /api/units/:id ─────────────────────────────────────────────────────
  fastify.put('/units/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = updateUnitSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const unit = await prisma.unit.update({ where: { id }, data: result.data });
    return reply.send(successResponse(unit));
  });
}
