import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateLandlord } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';

const updateApplicationSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'scheduled', 'viewed']),
  message: z.string().optional(),
});

export async function applicationsRoutes(fastify: FastifyInstance) {
  // ── GET /api/applications ──────────────────────────────────────────────────
  fastify.get('/', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };

    const applications = await prisma.application.findMany({
      where: { landlord_id: landlordId },
      include: {
        tenant: true,
        unit: {
          include: { property: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return reply.send(successResponse(applications, { total: applications.length }));
  });

  // ── PUT /api/applications/:id ──────────────────────────────────────────────
  fastify.put('/:id', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const { id } = request.params as { id: string };
    
    const result = updateApplicationSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const existing = await prisma.application.findFirst({
      where: { id, landlord_id: landlordId }
    });

    if (!existing) {
      return reply.status(404).send(errorResponse(404, 'Application not found'));
    }

    const updated = await prisma.application.update({
      where: { id },
      data: result.data
    });

    return reply.send(successResponse(updated));
  });
}
