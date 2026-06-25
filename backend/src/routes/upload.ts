import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { uploadFile } from '../lib/storage';
import { successResponse, errorResponse } from '../utils/response';
import { authenticateLandlord, authenticateTenant } from '../middlewares/auth';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES   = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5 MB
const MAX_DOC_SIZE   = 10 * 1024 * 1024; // 10 MB

function randomName(original: string) {
  const ext = path.extname(original).toLowerCase() || '.bin';
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

export async function uploadRoutes(fastify: FastifyInstance) {

  // ── POST /api/upload/property-photo ────────────────────────────────────────
  // Landlord uploads a photo for one of their units/properties.
  // Returns { url } — store this in unit.photo_urls[]
  fastify.post('/property-photo', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id: landlordId } = request.user as { id: string };
    const data = await (request as any).file();

    if (!data) {
      return reply.status(400).send(errorResponse(400, 'No file uploaded'));
    }

    const mimeType: string = data.mimetype;
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return reply.status(400).send(errorResponse(400, 'Only JPEG, PNG, and WebP images are allowed'));
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_IMAGE_SIZE) {
      return reply.status(400).send(errorResponse(400, 'Image must be under 5 MB'));
    }

    const fileName = randomName(data.filename || 'photo.jpg');
    const storagePath = `landlord-${landlordId}/${fileName}`;

    try {
      const url = await uploadFile({
        bucket: 'property-photos',
        path: storagePath,
        buffer,
        mimeType,
      });
      return reply.send(successResponse({ url, path: storagePath }));
    } catch (err: any) {
      console.error('[Upload] property-photo error:', err.message);
      return reply.status(500).send(errorResponse(500, err.message || 'Upload failed'));
    }
  });

  // ── POST /api/upload/tenant-doc ────────────────────────────────────────────
  // Tenant uploads a KYC document (Aadhaar, PAN, police verification, etc.)
  // Saves a Document record in DB and returns { url, document_id }
  fastify.post('/tenant-doc', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const data = await (request as any).file({
      limits: { fileSize: MAX_DOC_SIZE },
    });

    if (!data) {
      return reply.status(400).send(errorResponse(400, 'No file uploaded'));
    }

    // doc_type comes as a field in the multipart form
    const docType = data.fields?.doc_type?.value as string || 'other';

    const mimeType: string = data.mimetype;
    if (!ALLOWED_DOC_TYPES.includes(mimeType)) {
      return reply.status(400).send(errorResponse(400, 'Only JPEG, PNG, and PDF files are allowed'));
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_DOC_SIZE) {
      return reply.status(400).send(errorResponse(400, 'File must be under 10 MB'));
    }

    const fileName = randomName(data.filename || 'doc.pdf');
    const storagePath = `tenant-${tenantId}/${docType}/${fileName}`;

    try {
      const url = await uploadFile({
        bucket: 'tenant-docs',
        path: storagePath,
        buffer,
        mimeType,
      });

      // Save document record in DB
      const doc = await prisma.document.create({
        data: {
          tenant_id: tenantId,
          entity_type: 'tenant',
          entity_id: tenantId,
          doc_type: docType as any,
          storage_url: url,
          file_name: data.filename || fileName,
          file_size: buffer.length,
        }
      });

      return reply.send(successResponse({ url, document_id: doc.id }));
    } catch (err: any) {
      console.error('[Upload] tenant-doc error:', err.message);
      return reply.status(500).send(errorResponse(500, err.message || 'Upload failed'));
    }
  });

  // ── POST /api/upload/maintenance-photo ─────────────────────────────────────
  // Tenant or landlord uploads a photo for a maintenance request
  fastify.post('/maintenance-photo', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const data = await (request as any).file();

    if (!data) return reply.status(400).send(errorResponse(400, 'No file uploaded'));

    const mimeType: string = data.mimetype;
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return reply.status(400).send(errorResponse(400, 'Only JPEG, PNG, and WebP images are allowed'));
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_IMAGE_SIZE) {
      return reply.status(400).send(errorResponse(400, 'Image must be under 5 MB'));
    }

    const fileName = randomName(data.filename || 'photo.jpg');
    const storagePath = `maintenance/tenant-${tenantId}/${fileName}`;

    try {
      const url = await uploadFile({
        bucket: 'property-photos',
        path: storagePath,
        buffer,
        mimeType,
      });
      return reply.send(successResponse({ url }));
    } catch (err: any) {
      return reply.status(500).send(errorResponse(500, err.message || 'Upload failed'));
    }
  });
}
