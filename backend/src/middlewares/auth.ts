import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

// Middleware to authenticate admin JWT
export async function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const payload = request.user as { id: string; role: string };
    if (payload.role !== 'admin') {
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }
  } catch {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}

// Middleware to authenticate landlord JWT
export async function authenticateLandlord(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const payload = request.user as { id: string; role: string };
    if (payload.role !== 'landlord') {
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }

    const landlord = await prisma.landlord.findUnique({
      where: { id: payload.id },
      select: { is_suspended: true },
    });

    if (!landlord || landlord.is_suspended) {
      return reply.status(403).send({ success: false, error: 'Account suspended. Please contact support.' });
    }
  } catch {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}

// Middleware to authenticate tenant JWT
export async function authenticateTenant(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const payload = request.user as { id: string; role: string };
    if (payload.role !== 'tenant') {
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }
  } catch {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
}
