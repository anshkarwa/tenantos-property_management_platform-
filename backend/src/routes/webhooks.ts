import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export async function webhookRoutes(fastify: FastifyInstance) {

  // Capture raw body for signature verification (before JSON parsing)
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        (req as any).rawBody = body;
        done(null, JSON.parse(body.toString()));
      } catch (err: any) {
        done(err, undefined);
      }
    }
  );

  /**
   * POST /api/webhooks/razorpay
   *
   * Razorpay calls this server-side when a payment event fires — even if the
   * user closes the browser tab before the frontend callback runs.
   *
   * Setup in Razorpay Dashboard:
   *   Settings → Webhooks → Add URL → https://yourdomain.com/api/webhooks/razorpay
   *   Events: payment.captured, payment.failed
   *   Copy the Webhook Secret → RAZORPAY_WEBHOOK_SECRET in backend/.env
   */
  fastify.post('/razorpay', async (request, reply) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // ── 1. Verify signature ─────────────────────────────────────────────────
    if (webhookSecret && webhookSecret !== 'your-webhook-secret') {
      const signature = request.headers['x-razorpay-signature'] as string;
      if (!signature) {
        return reply.status(400).send({ error: 'Missing signature header' });
      }
      const rawBody = (request as any).rawBody as Buffer;
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expected !== signature) {
        console.warn('[Webhook] Invalid Razorpay signature — rejected');
        return reply.status(400).send({ error: 'Invalid signature' });
      }
    } else {
      console.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured — skipping signature check');
    }

    // ── 2. Parse event ──────────────────────────────────────────────────────
    const event = request.body as any;
    const eventType: string = event?.event;
    const payment = event?.payload?.payment?.entity;

    console.log(`[Webhook] ${eventType} | payment: ${payment?.id} | order: ${payment?.order_id}`);

    if (payment) {
      try {
        if (eventType === 'payment.captured') {
          await handlePaymentCaptured(payment);
        } else if (eventType === 'payment.failed') {
          await handlePaymentFailed(payment);
        }
      } catch (err: any) {
        // Log but still return 200 — Razorpay retries on non-2xx (risk of duplicates)
        console.error(`[Webhook] Handler error:`, err.message);
      }
    }

    return reply.status(200).send({ received: true });
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handlePaymentCaptured(payment: any) {
  const orderId: string = payment.order_id;
  const paymentId: string = payment.id;
  const amountINR = payment.amount / 100;

  // Fetch the order from Razorpay to read the receipt field
  // receipt: "receipt_<collectionId>"   → rent payment
  // receipt: "membership_<tenantId>_<ts>" → membership
  const order = await fetchRazorpayOrder(orderId);
  const receipt: string = order?.receipt || '';

  if (receipt.startsWith('receipt_')) {
    const collectionId = receipt.replace('receipt_', '');
    await markRentPaid(collectionId, paymentId, amountINR);
  } else if (receipt.startsWith('membership_')) {
    const tenantId = receipt.split('_')[1];
    await activateMembership(tenantId);
  } else {
    console.warn('[Webhook] Unknown receipt format:', receipt, '— cannot route payment');
  }
}

async function handlePaymentFailed(payment: any) {
  const order = await fetchRazorpayOrder(payment.order_id);
  const receipt: string = order?.receipt || '';

  if (receipt.startsWith('receipt_')) {
    const collectionId = receipt.replace('receipt_', '');
    const col = await prisma.rentCollection.findUnique({ where: { id: collectionId } });
    if (col && col.status === 'pending') {
      await prisma.rentCollection.update({
        where: { id: collectionId },
        data: { status: 'overdue' }, // 'failed' not in enum; overdue is closest
      });
      console.log(`[Webhook] Rent invoice ${collectionId} marked failed`);
    }
  }
}

// ─── DB helpers ────────────────────────────────────────────────────────────────

async function markRentPaid(collectionId: string, paymentId: string, amountINR: number) {
  const col = await prisma.rentCollection.findUnique({
    where: { id: collectionId },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: true,
        }
      }
    }
  });

  if (!col) { console.warn('[Webhook] Collection not found:', collectionId); return; }
  if (col.status === 'paid') { console.log('[Webhook] Already paid — skipping'); return; }

  const count = await prisma.rentCollection.count();
  const receiptNumber = `RC-${new Date().getFullYear()}-${String(count + 1).padStart(8, '0')}`;

  await prisma.$transaction(async (tx) => {
    await tx.rentCollection.update({
      where: { id: collectionId },
      data: {
        status: 'paid',
        amount_paid: amountINR,
        paid_at: new Date(),
        payment_method: 'upi',
        upi_ref: paymentId,
        receipt_number: receiptNumber,
      }
    });

    await tx.activityLog.create({
      data: {
        landlord_id: col.lease.unit.property.landlord_id,
        type: 'payment',
        message: `${col.lease.tenant.name} paid ₹${amountINR.toLocaleString('en-IN')} via Razorpay for ${col.lease.unit.unit_number}`,
        entity_id: col.id,
      }
    });
  });

  console.log(`[Webhook] ✅ Rent paid: ${collectionId} | ₹${amountINR} | receipt ${receiptNumber}`);
}

async function activateMembership(tenantId: string) {
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { membership_tier: 'pro', membership_expires_at: expiresAt },
  });

  console.log(`[Webhook] ✅ Membership activated: tenant ${tenantId} → expires ${expiresAt.toDateString()}`);
}

// ─── Razorpay order fetch ──────────────────────────────────────────────────────

async function fetchRazorpayOrder(orderId: string): Promise<{ receipt: string } | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || keyId === 'rzp_test_invalid') return null;

  try {
    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}
