import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { successResponse } from '../utils/response';

export async function publicRoutes(fastify: FastifyInstance) {
  // ── GET /api/public/listings ───────────────────────────────────────────────
  fastify.get('/listings', async (request, reply) => {
    // Return all units that are published
    const listings = await prisma.unit.findMany({
      where: {
        is_published: true,
        is_deleted: false,
        status: 'vacant',
      },
      include: {
        property: {
          select: {
            name: true,
            city: true,
            state: true,
            address_line1: true,
            amenities: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return reply.send(successResponse(listings, { total: listings.length }));
  });
}
