import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateTenant } from '../middlewares/auth';
import { successResponse, errorResponse } from '../utils/response';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_invalid',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret',
});

const createMaintenanceSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.enum(['plumbing', 'electrical', 'appliance', 'structural', 'pest', 'cleaning', 'carpentry', 'painting', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

export async function tenantPortalRoutes(fastify: FastifyInstance) {

  // ── GET /api/tenant/me ─────────────────────────────────────────────────────
  // Returns tenant profile + active lease + unit + property
  fastify.get('/me', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, phone: true, email: true,
        aadhaar_verified: true, kyc_status: true, pan: true, profession: true,
        police_verification_status: true, whatsapp_opted_in: true,
        emergency_contact: true, created_at: true,
        membership_tier: true, membership_expires_at: true,
        leases: {
          where: { status: { in: ['active', 'notice'] }, is_deleted: false },
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            unit: {
              include: {
                property: {
                  select: {
                    id: true, name: true, address_line1: true,
                    address_line2: true, city: true, state: true, pincode: true,
                    amenities: true,
                    landlord: { select: { name: true, phone: true, pan: true } },
                  },
                },
              },
            },
            co_tenant_splits: true,
          },
        },
      },
    });

    if (!tenant) return reply.status(404).send(errorResponse(404, 'Tenant not found'));

    const activeLease = tenant.leases[0] || null;
    const now = new Date();
    const daysUntilExpiry = activeLease
      ? Math.ceil((new Date(activeLease.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return reply.send(successResponse({
      ...tenant,
      leases: undefined,
      active_lease: activeLease
        ? {
            id: activeLease.id,
            start_date: activeLease.start_date,
            end_date: activeLease.end_date,
            monthly_rent: activeLease.monthly_rent,
            security_deposit: activeLease.security_deposit,
            rent_due_day: activeLease.rent_due_day,
            status: activeLease.status,
            esign_status: activeLease.esign_status,
            notice_period_days: activeLease.notice_period_days,
            annual_escalation_pct: activeLease.annual_escalation_pct,
            agreement_clauses: activeLease.agreement_clauses,
            co_tenant_splits: activeLease.co_tenant_splits,
            days_until_expiry: daysUntilExpiry,
            unit: activeLease.unit,
          }
        : null,
    }));
  });

  // ── GET /api/tenant/payments ───────────────────────────────────────────────
  // Rent payment history for the tenant
  fastify.get('/payments', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '12');

    const payments = await prisma.rentCollection.findMany({
      where: { lease: { tenant_id: tenantId } },
      include: {
        lease: {
          select: {
            monthly_rent: true,
            unit: { select: { unit_number: true, property: { select: { name: true } } } },
          },
        },
        co_tenant_payments: true,
      },
      orderBy: { due_date: 'desc' },
      take: limit,
    });

    // Compute overdue status on-the-fly for pending records
    const now = new Date();
    const enriched = payments.map(p => ({
      ...p,
      is_overdue: p.status === 'pending' && p.due_date < now,
      days_overdue: p.status === 'pending' && p.due_date < now
        ? Math.floor((now.getTime() - p.due_date.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    return reply.send(successResponse(enriched, { total: enriched.length }));
  });

  // ── GET /api/tenant/receipts ───────────────────────────────────────────────
  // Downloadable rent receipts
  fastify.get('/receipts', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const receipts = await prisma.rentCollection.findMany({
      where: {
        lease: { tenant_id: tenantId },
        status: { in: ['paid', 'late'] },
        receipt_number: { not: null },
      },
      select: {
        id: true, receipt_number: true, amount_paid: true,
        paid_at: true, payment_method: true, upi_ref: true,
        due_date: true, late_fee_applied: true, gst_amount: true,
        tds_deducted: true, receipt_pdf_url: true,
        lease: {
          select: {
            monthly_rent: true,
            unit: { select: { unit_number: true, property: { select: { name: true } } } },
            tenant: { select: { name: true, pan: true } },
          },
        },
      },
      orderBy: { paid_at: 'desc' },
    });

    return reply.send(successResponse(receipts, { total: receipts.length }));
  });

  // ── GET /api/tenant/receipts/:id/download ────────────────────────────────
  fastify.get('/receipts/:id/download', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const receipt = await prisma.rentCollection.findFirst({
      where: { id, status: 'paid', lease: { tenant_id: tenantId } },
      include: {
        lease: {
          include: {
            unit: { include: { property: { include: { landlord: true } } } },
            tenant: true
          }
        }
      }
    });

    if (!receipt) {
      return reply.status(404).send(errorResponse(404, 'Receipt not found'));
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Helper functions for lines
    const drawLine = (y: number, color = '#e5e7eb') => {
      doc.moveTo(50, y).lineTo(545, y).lineWidth(1).stroke(color);
    };

    // Build PDF content
    // Header
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827').text('RENT RECEIPT', { align: 'center' });
    doc.font('Helvetica').fontSize(11).fillColor('#6b7280').text('For House Rent Allowance (HRA) Tax Exemption', { align: 'center' });
    
    doc.moveDown(1.5);
    drawLine(doc.y);
    doc.moveDown(1.5);
    
    // Receipt Info Row
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Receipt Number', 50, doc.y, { continued: true });
    doc.text('Date', { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text(receipt.receipt_number || receipt.id, 50, doc.y + 4, { continued: true });
    doc.text(receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString('en-GB') : 'N/A', { align: 'right' });
    
    doc.moveDown(2);

    // Box for Payment Details
    const boxTop = doc.y;
    doc.roundedRect(50, boxTop, 495, 110, 6).lineWidth(1).stroke('#e5e7eb');
    
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#6b7280').text('PAYMENT DETAILS', 65, boxTop + 15);
    doc.font('Helvetica').fontSize(12).fillColor('#374151').text('For the Month of', 65, boxTop + 40, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#111827').text(new Date(receipt.due_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), { align: 'right', width: 465 });
    
    doc.moveTo(65, boxTop + 65).lineTo(530, boxTop + 65).lineWidth(1).stroke('#f3f4f6');
    
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Amount Paid', 65, boxTop + 85, { continued: true });
    doc.font('Helvetica-Bold').fontSize(18).text(`INR ${receipt.amount_paid.toLocaleString('en-IN')}`, { align: 'right', width: 465 });

    doc.moveDown(4);

    // Tenant and Landlord Details (Two columns)
    const colTop = doc.y;
    doc.roundedRect(50, colTop, 240, 100, 6).stroke('#e5e7eb');
    doc.roundedRect(305, colTop, 240, 100, 6).stroke('#e5e7eb');

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#6b7280').text('RECEIVED FROM (TENANT)', 65, colTop + 15);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(receipt.lease.tenant.name, 65, colTop + 35);
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(`PAN: ${receipt.lease.tenant.pan || 'Not Provided'}`, 65, colTop + 55);
    doc.text(`Property: Unit ${receipt.lease.unit.unit_number}, ${receipt.lease.unit.property.name}`, 65, colTop + 70, { width: 210, height: 30 });

    const isPanRequired = (receipt.lease.monthly_rent * 12) > 100000;
    const landlordPanStatus = receipt.lease.unit.property.landlord.pan ? receipt.lease.unit.property.landlord.pan : (isPanRequired ? 'Required (annual rent > 1L)' : 'Not Provided');

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#6b7280').text('RECEIVED BY (LANDLORD)', 320, colTop + 15);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(receipt.lease.unit.property.landlord.name, 320, colTop + 35);
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(`PAN: ${landlordPanStatus}`, 320, colTop + 55);
    doc.text(`Property: Unit ${receipt.lease.unit.unit_number}, ${receipt.lease.unit.property.name}`, 320, colTop + 70, { width: 210, height: 30 });

    doc.moveDown(8);
    drawLine(doc.y);
    doc.moveDown(1.5);
    
    // Declaration
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#6b7280').text(
      'I hereby declare that the rent mentioned above has been paid by the above-mentioned tenant for the property at the above-mentioned address. This receipt is issued for the purpose of claiming HRA exemption under Section 10(13A) of the Income Tax Act, 1961.',
      { align: 'justify', lineGap: 2 }
    );

    doc.moveDown(2.5);
    
    // Dotted line
    const dotY = doc.y;
    doc.lineWidth(0.5).strokeColor('#d1d5db');
    let x = 50;
    while(x < 545) {
      doc.moveTo(x, dotY).lineTo(x + 3, dotY).stroke();
      x += 6;
    }

    doc.moveDown(3);
    
    // Signatures
    doc.font('Helvetica').fontSize(10).fillColor('#9ca3af').text('Tenant Signature', 50, doc.y, { continued: true });
    doc.text('Landlord Signature', { align: 'right' });
    
    doc.moveDown(3);
    const lineY = doc.y;
    doc.moveTo(50, lineY).lineTo(200, lineY).lineWidth(1).stroke('#d1d5db');
    doc.moveTo(395, lineY).lineTo(545, lineY).lineWidth(1).stroke('#d1d5db');

    doc.end();

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="Rent_Receipt_${receipt.receipt_number || receipt.id}.pdf"`)
          .send(pdfBuffer);
        resolve(true);
      });
      doc.on('error', reject);
    });
  });

  // ── GET /api/tenant/next-due ───────────────────────────────────────────────
  // Returns the upcoming/current due payment
  fastify.get('/next-due', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const activeLease = await prisma.lease.findFirst({
      where: { tenant_id: tenantId, status: { in: ['active', 'notice'] }, is_deleted: false },
      orderBy: { created_at: 'desc' },
    });

    if (!activeLease) {
      return reply.send(successResponse(null));
    }

    const now = new Date();
    // Find pending/overdue collection
    const pendingPayment = await prisma.rentCollection.findFirst({
      where: {
        lease_id: activeLease.id,
        status: { in: ['pending', 'overdue'] },
      },
      orderBy: { due_date: 'asc' },
    });

    if (pendingPayment) {
      return reply.send(successResponse({
        ...pendingPayment,
        days_overdue: pendingPayment.due_date < now
          ? Math.floor((now.getTime() - pendingPayment.due_date.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        late_fee_per_day: 50, // configurable in future
      }));
    }

    // Compute next due date
    const dueDay = activeLease.rent_due_day;
    const nextDue = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (nextDue <= now) nextDue.setMonth(nextDue.getMonth() + 1);

    return reply.send(successResponse({
      lease_id: activeLease.id,
      amount_due: activeLease.monthly_rent,
      due_date: nextDue,
      status: 'upcoming',
      days_until_due: Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  });

  // ── GET /api/tenant/applications ─────────────────────────────────────────
  // Tenant's own rental applications
  fastify.get('/applications', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const applications = await prisma.application.findMany({
      where: { tenant_id: tenantId },
      include: {
        unit: {
          select: {
            unit_number: true, unit_type: true, monthly_rent: true,
            property: { select: { name: true, city: true, address_line1: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send(successResponse(applications, { total: applications.length }));
  });

  // ── GET /api/tenant/maintenance ────────────────────────────────────────────
  // Tenant's own maintenance requests
  fastify.get('/maintenance', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const requests = await prisma.maintenanceRequest.findMany({
      where: { tenant_id: tenantId },
      include: {
        vendor: { select: { name: true, phone: true, rating: true } },
        unit: { select: { unit_number: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return reply.send(successResponse(requests, { total: requests.length }));
  });

  // ── POST /api/tenant/maintenance ───────────────────────────────────────────
  // Tenant raises a new maintenance request
  fastify.post('/maintenance', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const result = createMaintenanceSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    // Get tenant's active lease to find unit
    const activeLease = await prisma.lease.findFirst({
      where: { tenant_id: tenantId, status: { in: ['active', 'notice'] }, is_deleted: false },
      include: { unit: { include: { property: { include: { landlord: true } } } } },
    });

    if (!activeLease) {
      return reply.status(400).send(errorResponse(400, 'No active lease found'));
    }

    const req = await prisma.maintenanceRequest.create({
      data: {
        ...result.data,
        unit_id: activeLease.unit_id,
        tenant_id: tenantId,
        status: 'open',
      },
    });

    // Log in landlord's activity
    await prisma.activityLog.create({
      data: {
        landlord_id: activeLease.unit.property.landlord_id,
        type: 'maintenance',
        message: `Tenant request: ${req.title} (${activeLease.unit.unit_number})`,
        entity_id: req.id,
      },
    });

    return reply.status(201).send(successResponse(req));
  });

  // ── GET /api/tenant/passport ───────────────────────────────────────────────
  // Rental passport — verified credentials for future applications
  fastify.get('/passport', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, phone: true, email: true,
        aadhaar_verified: true, pan: true, profession: true,
        police_verification_status: true, id_proof_type: true,
        created_at: true, membership_tier: true, membership_expires_at: true,
        leases: {
          where: { is_deleted: false },
          orderBy: { start_date: 'desc' },
          select: {
            id: true, start_date: true, end_date: true, status: true,
            monthly_rent: true, esign_status: true,
            unit: {
              select: {
                unit_number: true, unit_type: true,
                property: { select: { name: true, city: true, state: true } },
              },
            },
          },
        },
      },
    });

    if (!tenant) return reply.status(404).send(errorResponse(404, 'Tenant not found'));

    // Payment reliability score
    const payments = await prisma.rentCollection.findMany({
      where: { lease: { tenant_id: tenantId } },
      select: { status: true },
    });

    const totalPayments = payments.length;
    const onTimePayments = payments.filter(p => p.status === 'paid').length;
    const reliabilityScore = totalPayments > 0
      ? Math.round((onTimePayments / totalPayments) * 100)
      : 100;

    return reply.send(successResponse({
      ...tenant,
      stats: {
        total_payments: totalPayments,
        on_time_payments: onTimePayments,
        reliability_score: reliabilityScore,
        total_leases: tenant.leases.length,
        verified_identity: tenant.aadhaar_verified,
        police_verified: tenant.police_verification_status === 'verified',
      },
    }));
  });

  // ── GET /api/tenant/passport/pdf ──────────────────────────────────────────
  fastify.get('/passport/pdf', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, phone: true, email: true,
        aadhaar_verified: true, pan: true, profession: true,
        police_verification_status: true,
        membership_tier: true, membership_expires_at: true,
        created_at: true,
        leases: {
          where: { is_deleted: false },
          orderBy: { start_date: 'desc' },
          select: {
            id: true, start_date: true, end_date: true, status: true, monthly_rent: true,
            unit: { select: { unit_type: true, property: { select: { name: true, city: true, state: true } } } },
          },
        },
      },
    });

    if (!tenant) return reply.status(404).send(errorResponse(404, 'Tenant not found'));

    const payments = await prisma.rentCollection.findMany({
      where: { lease: { tenant_id: tenantId } },
      select: { status: true },
    });

    const totalPayments = payments.length;
    const onTimePayments = payments.filter(p => p.status === 'paid').length;
    const reliabilityScore = totalPayments > 0 ? Math.round((onTimePayments / totalPayments) * 100) : 100;
    const scoreLabel = reliabilityScore >= 80 ? 'Excellent' : reliabilityScore >= 60 ? 'Good' : 'Fair';
    const activeLease = tenant.leases.find(l => l.status === 'active' || l.status === 'notice');

    const PDFDocument = require('pdfkit') as any;
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: 'TenantOS Rental Passport', Author: 'TenantOS' } });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);

      const W = 595.28, H = 841.89;
      const pad = 48;

      // ── Background ──────────────────────────────────────────────────────────
      doc.rect(0, 0, W, H).fill('#0d1117');

      // ── Top gradient band ────────────────────────────────────────────────────
      doc.rect(0, 0, W, 220).fill('#111827');
      // Accent bar at very top
      doc.rect(0, 0, W, 4).fill('#3d7bff');

      // ── Watermark ────────────────────────────────────────────────────────────
      doc.save()
        .fontSize(120).fillColor('#ffffff').fillOpacity(0.02)
        .font('Helvetica-Bold')
        .text('TenantOS', 60, 300, { width: 480, align: 'center' })
        .restore();

      // ── Header: TenantOS branding ─────────────────────────────────────────
      doc.fontSize(11).fillColor('#3d7bff').fillOpacity(1)
        .font('Helvetica-Bold')
        .text('TenantOS', pad, 28);
      doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
        .text('Rental Passport', pad, 43);

      // Issue date top-right
      doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
        .text(`Issued: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, W - pad - 120, 35, { width: 120, align: 'right' });

      // ── Score circle ─────────────────────────────────────────────────────────
      const cx = pad + 52, cy = 155, r = 44;
      // Outer ring
      doc.save().circle(cx, cy, r + 6).fillColor('#1e2a3a').fill().restore();
      // Score arc (approximate with a filled circle + mask — pdfkit doesn't do arcs easily so we use filled circle)
      doc.save().circle(cx, cy, r).fillColor('#3d7bff').fill().restore();
      doc.save().circle(cx, cy, r - 10).fillColor('#111827').fill().restore();
      // Score number
      doc.fontSize(26).fillColor('#ffffff').font('Helvetica-Bold')
        .text(String(reliabilityScore), cx - 22, cy - 16, { width: 44, align: 'center' });
      doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
        .text('/ 100', cx - 18, cy + 12, { width: 36, align: 'center' });

      // Score label badge
      const badgeColor = reliabilityScore >= 80 ? '#22c55e' : reliabilityScore >= 60 ? '#3d7bff' : '#f59e0b';
      doc.roundedRect(cx - 28, cy + r + 8, 56, 16, 8).fill(badgeColor + '30');
      doc.fontSize(8).fillColor(badgeColor).font('Helvetica-Bold')
        .text(scoreLabel, cx - 28, cy + r + 11, { width: 56, align: 'center' });

      // ── Tenant name + details ────────────────────────────────────────────────
      const nameX = pad + 120;
      doc.fontSize(20).fillColor('#f9fafb').font('Helvetica-Bold')
        .text(tenant.name, nameX, 105, { width: W - nameX - pad });
      doc.fontSize(10).fillColor('#9ca3af').font('Helvetica')
        .text(tenant.profession || 'Professional', nameX, 130);
      if (activeLease) {
        doc.fontSize(9).fillColor('#6b7280')
          .text(`${activeLease.unit.property.city}, ${activeLease.unit.property.state}`, nameX, 146);
      }

      // Contact row
      doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
        .text(`📞 ${tenant.phone}`, nameX, 168);
      if (tenant.email) {
        doc.text(`✉ ${tenant.email}`, nameX, 182);
      }

      // ── Divider ──────────────────────────────────────────────────────────────
      doc.moveTo(pad, 232).lineTo(W - pad, 232).strokeColor('#1e2a3a').lineWidth(1).stroke();

      // ── Stats row ────────────────────────────────────────────────────────────
      const statsY = 248;
      const statItems = [
        { label: 'Reliability Score', value: `${reliabilityScore}%`, color: badgeColor },
        { label: 'Months Rented', value: String(totalPayments), color: '#3d7bff' },
        { label: 'On-time Payments', value: String(onTimePayments), color: '#22c55e' },
        { label: 'Properties', value: String(tenant.leases.length), color: '#a78bfa' },
      ];
      const statW = (W - pad * 2) / statItems.length;
      statItems.forEach((s, i) => {
        const sx = pad + i * statW;
        doc.roundedRect(sx + 4, statsY, statW - 8, 60, 6).fill('#111827');
        doc.fontSize(20).fillColor(s.color).font('Helvetica-Bold')
          .text(s.value, sx + 4, statsY + 10, { width: statW - 8, align: 'center' });
        doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
          .text(s.label, sx + 4, statsY + 38, { width: statW - 8, align: 'center' });
      });

      // ── Verifications ────────────────────────────────────────────────────────
      const verY = statsY + 80;
      doc.fontSize(10).fillColor('#e5e7eb').font('Helvetica-Bold')
        .text('Verification Status', pad, verY);

      const verItems = [
        { label: 'Aadhaar Verified', ok: tenant.aadhaar_verified },
        { label: 'PAN Linked', ok: !!tenant.pan },
        { label: 'Police Verification', ok: tenant.police_verification_status === 'verified' },
        { label: 'TenantOS Pro Member', ok: tenant.membership_tier === 'pro' },
      ];

      verItems.forEach((v, i) => {
        const vx = pad + (i % 2) * ((W - pad * 2) / 2 + 4);
        const vy = verY + 20 + Math.floor(i / 2) * 36;
        const bg = v.ok ? '#14291a' : '#1a1a1a';
        const border = v.ok ? '#22c55e' : '#374151';
        doc.roundedRect(vx, vy, (W - pad * 2) / 2 - 8, 28, 5).fill(bg);
        doc.roundedRect(vx, vy, (W - pad * 2) / 2 - 8, 28, 5).strokeColor(border).lineWidth(0.5).stroke();
        doc.fontSize(9).fillColor(v.ok ? '#22c55e' : '#6b7280').font('Helvetica-Bold')
          .text(v.ok ? '✓' : '✗', vx + 10, vy + 9);
        doc.fontSize(9).fillColor(v.ok ? '#d1fae5' : '#6b7280').font('Helvetica')
          .text(v.label, vx + 26, vy + 9);
      });

      // ── Rental history ───────────────────────────────────────────────────────
      const histY = verY + 110;
      doc.fontSize(10).fillColor('#e5e7eb').font('Helvetica-Bold')
        .text('Rental History', pad, histY);

      if (tenant.leases.length === 0) {
        doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
          .text('No lease history found.', pad, histY + 20);
      } else {
        const cols = { prop: pad, type: pad + 200, rent: pad + 290, period: pad + 370 };
        const hdrY = histY + 18;
        doc.fontSize(8).fillColor('#6b7280').font('Helvetica-Bold');
        doc.text('Property', cols.prop, hdrY);
        doc.text('Type', cols.type, hdrY);
        doc.text('Rent/mo', cols.rent, hdrY);
        doc.text('Period', cols.period, hdrY);
        doc.moveTo(pad, hdrY + 12).lineTo(W - pad, hdrY + 12).strokeColor('#1e2a3a').lineWidth(0.5).stroke();

        tenant.leases.slice(0, 5).forEach((l, i) => {
          const rowY = hdrY + 20 + i * 24;
          if (i % 2 === 0) doc.roundedRect(pad, rowY - 3, W - pad * 2, 22, 3).fill('#111827');
          const fmt = (d: any) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
          doc.fontSize(8.5).fillColor('#e5e7eb').font('Helvetica');
          doc.text(`${l.unit.property.name}, ${l.unit.property.city}`, cols.prop, rowY + 3, { width: 185, ellipsis: true });
          doc.text(l.unit.unit_type?.toUpperCase() || '—', cols.type, rowY + 3, { width: 80 });
          doc.text(`₹${Number(l.monthly_rent).toLocaleString('en-IN')}`, cols.rent, rowY + 3, { width: 75 });
          doc.text(`${fmt(l.start_date)} – ${l.end_date ? fmt(l.end_date) : 'Present'}`, cols.period, rowY + 3, { width: 130 });
        });
      }

      // ── Footer ───────────────────────────────────────────────────────────────
      doc.rect(0, H - 56, W, 56).fill('#111827');
      doc.moveTo(0, H - 56).lineTo(W, H - 56).strokeColor('#3d7bff').lineWidth(1).stroke();
      doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
        .text('This document is digitally generated by TenantOS and is valid at the time of issue.', pad, H - 40, { width: W - pad * 2, align: 'center' });
      doc.fontSize(8).fillColor('#4b5563')
        .text(`Passport ID: ${tenant.id}  ·  Generated: ${new Date().toISOString()}`, pad, H - 26, { width: W - pad * 2, align: 'center' });

      doc.end();
    });

    const pdf = Buffer.concat(chunks);
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="TenantOS_Passport_${tenant.name.replace(/\s+/g, '_')}.pdf"`)
      .send(pdf);
  });

  // ── GET /api/tenant/deposit ────────────────────────────────────────────────
  // Security deposit vault details
  fastify.get('/deposit', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    const leases = await prisma.lease.findMany({
      where: { tenant_id: tenantId, is_deleted: false },
      select: {
        id: true, start_date: true, end_date: true, status: true,
        security_deposit: true, monthly_rent: true,
        unit: {
          select: {
            unit_number: true,
            property: { select: { name: true, city: true, landlord: { select: { name: true } } } },
          },
        },
      },
      orderBy: { start_date: 'desc' },
    });

    const activeLease = leases.find(l => l.status === 'active' || l.status === 'notice');
    const totalDeposit = activeLease?.security_deposit || 0;
    const depositMonths = activeLease
      ? (activeLease.security_deposit / activeLease.monthly_rent).toFixed(1)
      : '0';

    // Calculate accrued interest (5% APY)
    const APY = 0.05;
    let accruedInterest = 0;
    if (activeLease && activeLease.start_date) {
      const msPassed = Date.now() - new Date(activeLease.start_date).getTime();
      const daysPassed = Math.max(0, msPassed / (1000 * 60 * 60 * 24));
      accruedInterest = totalDeposit * APY * (daysPassed / 365);
    }

    return reply.send(successResponse({
      active_lease: activeLease,
      total_deposit_held: totalDeposit,
      deposit_months: parseFloat(depositMonths),
      accrued_interest: accruedInterest,
      apy_rate: APY,
      past_leases: leases.filter(l => l.status === 'expired' || l.status === 'terminated'),
      // Estimated refund date (end of lease + 30 days standard)
      estimated_refund_date: activeLease
        ? new Date(new Date(activeLease.end_date).getTime() + 30 * 24 * 60 * 60 * 1000)
        : null,
    }));
  });

  // ── POST /api/tenant/pay/create-order ──────────────────────────────────────
  fastify.post('/pay/create-order', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { collection_id } = request.body as { collection_id: string };

    const collection = await prisma.rentCollection.findUnique({
      where: { id: collection_id },
      include: { lease: true }
    });

    let amountInPaise = 2500000; // default to 25,000 INR for mock

    if (!collection) {
      // Support mock frontend dashboard
      if (!collection_id.startsWith('col-') && !collection_id.startsWith('rh-')) {
        return reply.status(404).send(errorResponse(404, 'Rent invoice not found'));
      }
    } else {
      if (collection.lease.tenant_id !== tenantId) {
        return reply.status(403).send(errorResponse(403, 'Unauthorized access to this invoice'));
      }

      if (collection.status === 'paid') {
        return reply.status(400).send(errorResponse(400, 'Invoice is already paid'));
      }

      amountInPaise = Math.round(collection.amount_due * 100);
    }

    try {
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${collection_id}`,
      });

      return reply.send(successResponse({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      }));
    } catch (err: any) {
      // Graceful fallback for mock testing without real keys
      console.warn("Razorpay create failed (expected if keys are missing/invalid):", err.message);
      return reply.send(successResponse({
        order_id: `order_mock_${collection_id.substring(0,8)}`,
        amount: amountInPaise,
        currency: 'INR',
        is_mock: true,
      }));
    }
  });

  // ── POST /api/tenant/pay/verify ────────────────────────────────────────────
  fastify.post('/pay/verify', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { 
      collection_id,
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = request.body as any;

    const collection = await prisma.rentCollection.findUnique({
      where: { id: collection_id },
      include: { lease: { include: { unit: { include: { property: true } }, tenant: true } } }
    });

    if (!collection || collection.lease.tenant_id !== tenantId) {
      // Support mock frontend dashboard
      if (collection_id && (collection_id.startsWith('col-') || collection_id.startsWith('rh-'))) {
        return reply.send(successResponse({ message: 'Mock payment verified successfully' }));
      }
      return reply.status(404).send(errorResponse(404, 'Invoice not found or unauthorized'));
    }

    // Verify signature (skip if mock order)
    if (!razorpay_order_id?.startsWith('order_mock_')) {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'secret';
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return reply.status(400).send(errorResponse(400, 'Invalid payment signature'));
      }
    }

    // Update the invoice as paid
    const updated = await prisma.$transaction(async (tx) => {
      // Create receipt number
      const count = await tx.rentCollection.count();
      const padded = String(count + 1).padStart(8, '0');
      const receiptNumber = `RC-${new Date().getFullYear()}-${padded}`;

      const updatedCol = await tx.rentCollection.update({
        where: { id: collection_id },
        data: {
          status: 'paid',
          amount_paid: collection.amount_due,
          paid_at: new Date(),
          payment_method: 'upi', // generalized
          upi_ref: razorpay_payment_id || 'mock_ref_123',
          receipt_number: receiptNumber,
        }
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          landlord_id: collection.lease.unit.property.landlord_id,
          type: 'payment',
          message: `${collection.lease.tenant.name} paid ₹${collection.amount_due.toLocaleString('en-IN')} via Razorpay for ${collection.lease.unit.unit_number}`,
          entity_id: collection.id,
        }
      });

      return updatedCol;
    });

    return reply.send(successResponse(updated));
  });

  // ── POST /api/tenant/membership/create-order ───────────────────────────────
  fastify.post('/membership/create-order', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { plan_id } = request.body as { plan_id: 'yearly_999' };

    const planPrices: Record<string, number> = {
      'yearly_999': 999,
    };

    const price = planPrices[plan_id];
    if (!price) {
      return reply.status(400).send(errorResponse(400, 'Invalid plan selected'));
    }

    const totalAmount = Math.round(price * 1.18 * 100); // Add GST, in paise

    try {
      const order = await razorpay.orders.create({
        amount: totalAmount,
        currency: 'INR',
        receipt: `mem_${tenantId.slice(-12)}_${Date.now().toString().slice(-8)}`,
      });

      return reply.send(successResponse({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        plan_id: plan_id,
      }));
    } catch (err: any) {
      const msg = err?.error?.description || err?.message || 'Razorpay order creation failed';
      console.error('[Membership] Razorpay create-order error:', msg, err);
      return reply.status(502).send(errorResponse(502, `Payment gateway error: ${msg}`));
    }
  });

  // ── POST /api/tenant/membership/verify ─────────────────────────────────────
  fastify.post('/membership/verify', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { 
      plan_id,
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = request.body as any;

    // Verify signature (skip if mock order)
    if (!razorpay_order_id?.startsWith('order_mock_')) {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'secret';
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return reply.status(400).send(errorResponse(400, 'Invalid payment signature'));
      }
    }

    const daysToAdd = 365;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);

    // Update the Tenant
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        membership_tier: 'pro',
        membership_expires_at: expiresAt,
        razorpay_subscription_id: null, // one-time pass
      }
    });

    return reply.send(successResponse({
      membership_tier: updated.membership_tier,
      membership_expires_at: updated.membership_expires_at,
    }));
  });

  // ── POST /api/tenant/apply ─────────────────────────────────────────────────
  fastify.post('/apply', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    
    const applySchema = z.object({
      unit_id: z.string(),
      message: z.string().optional(),
      visit_date: z.string().optional(),
    });

    const result = applySchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { unit_id, message, visit_date } = result.data;

    const unit = await prisma.unit.findUnique({
      where: { id: unit_id },
      include: { property: true }
    });

    if (!unit) {
      return reply.status(404).send(errorResponse(404, 'Unit not found'));
    }

    const existing = await prisma.application.findFirst({
      where: {
        tenant_id: tenantId,
        unit_id: unit_id,
        status: { notIn: ['rejected'] }
      }
    });

    if (existing) {
      return reply.status(409).send(errorResponse(409, 'You already have an active application for this unit'));
    }

    const application = await prisma.application.create({
      data: {
        tenant_id: tenantId,
        unit_id,
        landlord_id: unit.property.landlord_id,
        message,
        visit_date: visit_date ? new Date(visit_date) : undefined
      }
    });

    return reply.status(201).send(successResponse(application, { message: 'Application submitted successfully' }));
  });

  // ── POST /api/tenant/applications/:id/pay-token/create-order ────────────
  fastify.post('/applications/:id/pay-token/create-order', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { id: applicationId } = request.params as { id: string };

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        tenant_id: tenantId,
      },
    });

    if (!application) {
      return reply.status(404).send(errorResponse(404, 'Application not found'));
    }

    if (application.status !== 'accepted') {
      return reply.status(400).send(errorResponse(400, 'Only accepted applications can be secured with a token'));
    }

    const tokenAmountINR = 5000;
    const amountInPaise = tokenAmountINR * 100;

    try {
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `app_token_${applicationId}`,
      });

      return reply.send(successResponse({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      }));
    } catch (err: any) {
      console.warn("Razorpay create failed (mock fallback):", err.message);
      return reply.send(successResponse({
        order_id: `order_mock_${applicationId.substring(0,8)}`,
        amount: amountInPaise,
        currency: 'INR',
        is_mock: true,
      }));
    }
  });

  // ── POST /api/tenant/applications/:id/pay-token/verify ──────────────────
  fastify.post('/applications/:id/pay-token/verify', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { id: applicationId } = request.params as { id: string };
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = request.body as any;

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        tenant_id: tenantId,
      },
    });

    if (!application || application.status !== 'accepted') {
      // Support mock frontend dashboard
      if (razorpay_order_id?.startsWith('order_mock_')) {
        return reply.send(successResponse({ message: 'Mock payment verified successfully' }));
      }
      return reply.status(404).send(errorResponse(404, 'Application not found or unauthorized'));
    }

    // Verify signature (skip if mock order)
    if (!razorpay_order_id?.startsWith('order_mock_')) {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'secret';
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return reply.status(400).send(errorResponse(400, 'Invalid payment signature'));
      }
    }

    // Update application status to indicate token is paid
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'scheduled',
        message: `[TOKEN PAID] ${application.message || ''}`,
      }
    });

    return reply.send(successResponse(updated, { message: 'Token payment successful. Property secured.' }));
  });

  // ══════════════════════════════════════════════════════════════════════════
  // KYC — Aadhaar manual upload flow
  // ══════════════════════════════════════════════════════════════════════════

  // GET /api/tenant/kyc — current KYC status + document URLs
  fastify.get('/kyc', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aadhaar_verified: true, aadhaar_number: true, id_proof_type: true, pan: true },
    });
    const docs = await prisma.document.findMany({
      where: { tenant_id: tenantId, doc_type: { in: ['aadhaar', 'pan'] as any } },
      orderBy: { created_at: 'desc' },
      select: { id: true, doc_type: true, storage_url: true, verified: true, created_at: true, file_name: true },
    });
    return reply.send(successResponse({ ...tenant, documents: docs }));
  });

  // POST /api/tenant/kyc/submit — save aadhaar number + document url, set pending
  fastify.post('/kyc/submit', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { aadhaar_last4, document_url, doc_type = 'aadhaar' } = request.body as {
      aadhaar_last4?: string; document_url: string; doc_type?: string;
    };

    if (!document_url) {
      return reply.status(400).send(errorResponse(400, 'document_url is required'));
    }

    // Mask aadhaar as XXXX-XXXX-LAST4
    const maskedAadhaar = aadhaar_last4
      ? `XXXX-XXXX-${aadhaar_last4.slice(-4)}`
      : undefined;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(maskedAadhaar ? { aadhaar_number: maskedAadhaar } : {}),
        id_proof_type: doc_type as any,
        kyc_status: 'pending',
      },
    });

    // Upsert document record
    await prisma.document.create({
      data: {
        tenant_id: tenantId,
        entity_type: 'tenant' as any,
        entity_id: tenantId,
        doc_type: doc_type as any,
        storage_url: document_url,
        verified: false,
      },
    });

    return reply.send(successResponse({ status: 'pending' }, { message: 'KYC documents submitted. Our team will verify within 24 hours.' }));
  });

  // POST /api/tenant/pan/update — save PAN number
  fastify.post('/pan/update', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { pan } = request.body as { pan: string };

    if (!pan || typeof pan !== 'string') {
      return reply.status(400).send(errorResponse(400, 'PAN number is required'));
    }

    const cleanPan = pan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
      return reply.status(400).send(errorResponse(400, 'Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F)'));
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { pan: cleanPan },
    });

    return reply.send(successResponse({ pan: cleanPan }, { message: 'PAN number linked successfully' }));
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POLICE VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  // GET /api/tenant/police-verification — current status
  fastify.get('/police-verification', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { police_verification_status: true, police_verification_date: true },
    });
    const doc = await prisma.document.findFirst({
      where: { tenant_id: tenantId, doc_type: 'police_verification' as any },
      orderBy: { created_at: 'desc' },
      select: { id: true, storage_url: true, created_at: true, verified: true },
    });
    return reply.send(successResponse({ ...tenant, document: doc }));
  });

  // POST /api/tenant/police-verification/submit
  fastify.post('/police-verification/submit', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { address_line1, address_line2, city, state, pincode, document_url } = request.body as {
      address_line1: string; address_line2?: string; city: string;
      state: string; pincode: string; document_url?: string;
    };

    if (!address_line1 || !city || !state || !pincode) {
      return reply.status(400).send(errorResponse(400, 'Address fields are required'));
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        police_verification_status: 'pending',
        notes: `[POLICE_VER_ADDR] ${address_line1}, ${address_line2 || ''}, ${city}, ${state} - ${pincode}`,
      },
    });

    if (document_url) {
      await prisma.document.create({
        data: {
          tenant_id: tenantId,
          entity_type: 'tenant' as any,
          entity_id: tenantId,
          doc_type: 'police_verification' as any,
          storage_url: document_url,
          verified: false,
        },
      });
    }

    return reply.send(successResponse({ status: 'pending' }, { message: 'Police verification request submitted. Processing takes 7–10 working days.' }));
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REFERRALS
  // ══════════════════════════════════════════════════════════════════════════

  // GET /api/tenant/referral — code + stats + history (Pro only)
  fastify.get('/referral', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };

    // Pro-only gate
    const tenantCheck = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { membership_tier: true, membership_expires_at: true } });
    const isPro = tenantCheck && ['pro', 'yearly'].includes(tenantCheck.membership_tier) &&
      (!tenantCheck.membership_expires_at || tenantCheck.membership_expires_at > new Date());
    if (!isPro) return reply.status(403).send(errorResponse(403, 'Referral programme is available to Pro members only'));

    // Auto-generate referral code if missing
    let tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, referral_code: true } as any,
    }) as any;

    if (!tenant?.referral_code) {
      const code = tenantId.slice(0, 6).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
      await (prisma.tenant as any).update({
        where: { id: tenantId },
        data: { referral_code: code },
      });
      tenant = { ...tenant, referral_code: code };
    }

    // Fetch referrals made by this tenant
    const referrals = await (prisma as any).referral.findMany({
      where: { referrer_id: tenantId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true, referred_phone: true, status: true,
        reward_amount: true, created_at: true,
        referred: { select: { name: true, phone: true } },
      },
    });

    const totalReferred = referrals.length;
    const verified = referrals.filter((r: any) => r.status === 'rewarded').length;
    const rewardsEarned = referrals
      .filter((r: any) => r.status === 'rewarded')
      .reduce((sum: number, r: any) => sum + r.reward_amount, 0);

    return reply.send(successResponse({
      referral_code: tenant.referral_code,
      total_referred: totalReferred,
      verified_count: verified,
      rewards_earned: rewardsEarned,
      referrals,
    }));
  });

  // POST /api/tenant/referral/track — log that a code was shared (Pro only)
  fastify.post('/referral/track', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { phone } = request.body as { phone: string };

    const tenantCheck = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { membership_tier: true, membership_expires_at: true } });
    const isPro = tenantCheck && ['pro', 'yearly'].includes(tenantCheck.membership_tier) &&
      (!tenantCheck.membership_expires_at || tenantCheck.membership_expires_at > new Date());
    if (!isPro) return reply.status(403).send(errorResponse(403, 'Referral programme is available to Pro members only'));

    if (!phone) return reply.status(400).send(errorResponse(400, 'phone is required'));

    // Prevent duplicate tracking for same phone
    const existing = await (prisma as any).referral.findFirst({
      where: { referrer_id: tenantId, referred_phone: phone },
    });
    if (existing) {
      return reply.send(successResponse(existing, { message: 'Already tracked' }));
    }

    const referral = await (prisma as any).referral.create({
      data: { referrer_id: tenantId, referred_phone: phone, status: 'pending' },
    });

    return reply.status(201).send(successResponse(referral, { message: 'Referral tracked!' }));
  });

  // GET /api/tenant/leases/pending-signature — leases where landlord signed, awaiting tenant
  fastify.get('/leases/pending-signature', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const leases = await prisma.lease.findMany({
      where: {
        tenant_id: tenantId,
        is_deleted: false,
        esign_status: 'landlord_signed',
      },
      select: {
        id: true, monthly_rent: true, start_date: true, end_date: true,
        esign_status: true, signed_by_landlord_at: true, agreement_clauses: true,
        unit: {
          select: {
            unit_number: true, unit_type: true,
            property: { select: { name: true, address_line1: true, city: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return reply.send(successResponse(leases));
  });

  // POST /api/tenant/leases/:id/sign — tenant digitally signs the lease
  fastify.post('/leases/:id/sign', { preHandler: authenticateTenant }, async (request, reply) => {
    const { id: tenantId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const lease = await prisma.lease.findFirst({
      where: { id, tenant_id: tenantId, is_deleted: false },
      select: { id: true, esign_status: true },
    });
    if (!lease) return reply.status(404).send(errorResponse(404, 'Lease not found'));
    if (lease.esign_status === 'completed') {
      return reply.status(400).send(errorResponse(400, 'Already signed'));
    }
    if (lease.esign_status !== 'landlord_signed') {
      return reply.status(400).send(errorResponse(400, 'Landlord has not signed yet'));
    }

    await prisma.lease.update({
      where: { id },
      data: {
        esign_status: 'completed',
        signed_by_tenant_at: new Date(),
      },
    });

    return reply.send(successResponse({ message: 'Lease signed successfully', esign_status: 'completed' }));
  });
}
