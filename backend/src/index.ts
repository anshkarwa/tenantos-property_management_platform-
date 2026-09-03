import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { propertiesRoutes } from './routes/properties';
import { tenantsRoutes } from './routes/tenants';
import { leasesRoutes } from './routes/leases';
import { rentRoutes } from './routes/rent';
import { maintenanceRoutes } from './routes/maintenance';
import { dashboardRoutes } from './routes/dashboard';
import { tenantPortalRoutes } from './routes/tenantPortal';
import { applicationsRoutes } from './routes/applications';
import { publicRoutes } from './routes/public';
import { adminRoutes } from './routes/admin';
import { webhookRoutes } from './routes/webhooks';
import { uploadRoutes } from './routes/upload';
import { reportsRoutes } from './routes/reports';
import { startCronJobs } from './cron/rentGenerator';

dotenv.config();

const server = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// ─── Plugins ──────────────────────────────────────────────────────────────────

server.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

server.register(jwt, {
  secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
});

server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

server.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// ─── Health & Readiness check ───────────────────────────────────────────────

server.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
}));

server.get('/ready', async (request, reply) => {
  try {
    const { prisma } = await import('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    return reply.status(200).send({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    server.log.error({ err }, 'Readiness check failed - Database disconnected');
    return reply.status(503).send({
      status: 'unavailable',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
server.register(authRoutes,         { prefix: '/api/auth' });
server.register(propertiesRoutes,   { prefix: '/api/properties' });
server.register(tenantsRoutes,      { prefix: '/api/tenants' });
server.register(leasesRoutes,       { prefix: '/api/leases' });
server.register(rentRoutes,         { prefix: '/api/rent' });
server.register(maintenanceRoutes,  { prefix: '/api/maintenance' });
server.register(dashboardRoutes,    { prefix: '/api/dashboard' });
server.register(tenantPortalRoutes, { prefix: '/api/tenant' });
server.register(applicationsRoutes, { prefix: '/api/applications' });
server.register(publicRoutes,       { prefix: '/api/public' });
server.register(adminRoutes,        { prefix: '/api/admin' });
server.register(webhookRoutes,      { prefix: '/api/webhooks' });
server.register(uploadRoutes,       { prefix: '/api/upload' });
server.register(reportsRoutes,      { prefix: '/api/reports' });

// ─── Start ────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`TenantOS API running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    
    // Start automated cron jobs
    startCronJobs();
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
