import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { sendOtpSms } from '../lib/sms';
import { authenticateLandlord } from '../middlewares/auth';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number (+91XXXXXXXXXX)'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const requestOtpSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number'),
});

const verifyOtpSchema = z.object({
  phone: z.string(),
  otp: z.string().length(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── Helper: Generate 6-digit OTP ────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Helper: Issue JWT tokens ─────────────────────────────────────────────────

function issueTokens(
  fastify: FastifyInstance,
  payload: { id: string; role: 'landlord' | 'tenant' }
) {
  const accessToken = fastify.jwt.sign(payload, { expiresIn: '15m' });
  const refreshToken = fastify.jwt.sign(payload, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance) {

  // ── POST /api/auth/landlord/register ────────────────────────────────────────
  fastify.post('/landlord/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { name, phone, email, password } = result.data;
    const { referral_code } = request.body as { referral_code?: string };

    // Check existing
    const existing = await prisma.landlord.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return reply.status(409).send(errorResponse(409, 'Email or phone already registered'));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const landlord = await prisma.landlord.create({
      data: {
        name,
        phone,
        email,
        kyc_status: 'not_started',
        auth: { create: { password_hash: passwordHash } },
      },
      select: { id: true, name: true, email: true, phone: true, kyc_status: true },
    });

    // If signed up via a tenant referral link, log a pending referral
    if (referral_code) {
      try {
        const referrer = await (prisma.tenant as any).findFirst({
          where: { referral_code },
          select: { id: true },
        });
        if (referrer) {
          // Check not already tracked for this phone
          const already = await (prisma as any).referral.findFirst({
            where: { referrer_id: referrer.id, referred_phone: phone },
          });
          if (!already) {
            await (prisma as any).referral.create({
              data: {
                referrer_id: referrer.id,
                referred_phone: phone,
                status: 'signed_up',
              },
            });
          }
        }
      } catch (e) {
        // Non-critical — don't fail registration
        console.error('[Referral] Error logging referral at registration:', e);
      }
    }

    const { accessToken, refreshToken } = issueTokens(fastify, { id: landlord.id, role: 'landlord' });

    // Store refresh token hash
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        landlord_id: landlord.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.status(201).send(successResponse({ landlord, accessToken, refreshToken }));
  });

  // ── POST /api/auth/landlord/login ────────────────────────────────────────────
  fastify.post('/landlord/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { email, password } = result.data;

    const landlord = await prisma.landlord.findUnique({
      where: { email },
      include: { auth: true },
    });

    if (!landlord || !landlord.auth) {
      return reply.status(401).send(errorResponse(401, 'Invalid email or password'));
    }

    if (landlord.is_suspended) {
      return reply.status(403).send(errorResponse(403, 'Your account has been suspended. Please contact support.'));
    }

    const valid = await bcrypt.compare(password, landlord.auth.password_hash);
    if (!valid) {
      return reply.status(401).send(errorResponse(401, 'Invalid email or password'));
    }

    const { accessToken, refreshToken } = issueTokens(fastify, { id: landlord.id, role: 'landlord' });

    // Store refresh token hash in the background to save remote DB latency
    import('crypto').then((crypto) => {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      prisma.refreshToken.create({
        data: {
          landlord_id: landlord.id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }).catch(err => fastify.log.error('Failed to save refresh token: ' + err.message));
    });

    return reply.send(successResponse({
      landlord: {
        id: landlord.id,
        name: landlord.name,
        email: landlord.email,
        phone: landlord.phone,
        kyc_status: landlord.kyc_status,
        onboarding_done: landlord.onboarding_done,
        preferred_lang: landlord.preferred_lang,
        upi_id: landlord.upi_id,
      },
      accessToken,
      refreshToken,
    }));
  });

  // ── POST /api/auth/landlord/request-otp ────────────────────────────────────────
  fastify.post('/landlord/request-otp', async (request, reply) => {
    const result = requestOtpSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { phone } = result.data;
    const landlord = await prisma.landlord.findFirst({ where: { phone } });
    if (!landlord) {
      return reply.status(404).send(errorResponse(404, 'No landlord found with this phone number'));
    }

    if (landlord.is_suspended) {
      return reply.status(403).send(errorResponse(403, 'Your account has been suspended. Please contact support.'));
    }

    const otp = generateOtp();
    const crypto = await import('crypto');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.landlordAuth.update({
      where: { landlord_id: landlord.id },
      data: { otp_hash: otpHash, otp_expires_at: otpExpiresAt },
    });

    try {
      await sendOtpSms(phone, otp);
    } catch (err) {
      console.error('[OTP] SMS delivery failed:', err);
      if (process.env.NODE_ENV !== 'development') {
        return reply.status(500).send(errorResponse(500, 'Failed to send OTP. Please try again.'));
      }
    }

    const devResponse = process.env.NODE_ENV === 'development' ? { otp } : {};

    return reply.send(successResponse({
      message: 'OTP sent to your WhatsApp / SMS',
      phone,
      expires_in: 600,
      ...devResponse,
    }));
  });

  // ── POST /api/auth/landlord/verify-otp ─────────────────────────────────────────
  fastify.post('/landlord/verify-otp', async (request, reply) => {
    const result = verifyOtpSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { phone, otp } = result.data;
    const landlord = await prisma.landlord.findFirst({
      where: { phone },
      include: { auth: true },
    });

    if (!landlord || !landlord.auth) {
      return reply.status(404).send(errorResponse(404, 'Landlord not found'));
    }

    if (landlord.is_suspended) {
      return reply.status(403).send(errorResponse(403, 'Your account has been suspended. Please contact support.'));
    }

    if (!landlord.auth.otp_hash || !landlord.auth.otp_expires_at || landlord.auth.otp_expires_at < new Date()) {
      return reply.status(400).send(errorResponse(400, 'Invalid or expired OTP. Please request a new one.'));
    }

    const crypto = await import('crypto');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    if (otpHash !== landlord.auth.otp_hash) {
      return reply.status(401).send(errorResponse(401, 'Invalid OTP'));
    }

    await prisma.landlordAuth.update({
      where: { landlord_id: landlord.id },
      data: { otp_hash: null, otp_expires_at: null },
    });

    const { accessToken, refreshToken } = issueTokens(fastify, { id: landlord.id, role: 'landlord' });

    // Store refresh token hash
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        landlord_id: landlord.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.send(successResponse({
      landlord: {
        id: landlord.id,
        name: landlord.name,
        email: landlord.email,
        phone: landlord.phone,
        kyc_status: landlord.kyc_status,
        onboarding_done: landlord.onboarding_done,
        preferred_lang: landlord.preferred_lang,
      },
      accessToken,
      refreshToken,
    }));
  });

  // ── POST /api/auth/landlord/forgot-password ──────────────────────────────────
  fastify.post('/landlord/forgot-password', async (request, reply) => {
    const result = forgotPasswordSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { email } = result.data;
    const landlord = await prisma.landlord.findUnique({ where: { email }, include: { auth: true } });
    
    if (!landlord) {
      // Don't leak whether email exists
      return reply.send(successResponse({ message: 'If an account exists, a password reset link has been sent.' }));
    }

    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.landlordAuth.upsert({
      where: { landlord_id: landlord.id },
      update: { reset_token_hash: resetTokenHash, reset_token_expires_at: resetTokenExpiresAt },
      create: { landlord_id: landlord.id, password_hash: '', reset_token_hash: resetTokenHash, reset_token_expires_at: resetTokenExpiresAt }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${email}&role=landlord`;

    const { sendPasswordResetEmail } = await import('../utils/mailer');
    try {
      await sendPasswordResetEmail(email, resetLink, 'landlord');
    } catch (err) {
      fastify.log.error('Failed to send reset email: ' + err);
    }

    return reply.send(successResponse({ message: 'If an account exists, a password reset link has been sent.' }));
  });

  // ── POST /api/auth/landlord/reset-password ───────────────────────────────────
  fastify.post('/landlord/reset-password', async (request, reply) => {
    const result = resetPasswordSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { email, token, password } = result.data;
    
    const landlord = await prisma.landlord.findUnique({ where: { email }, include: { auth: true } });
    if (!landlord || !landlord.auth) {
      return reply.status(400).send(errorResponse(400, 'Invalid token or account not found'));
    }

    if (!landlord.auth.reset_token_hash || !landlord.auth.reset_token_expires_at || landlord.auth.reset_token_expires_at < new Date()) {
      return reply.status(400).send(errorResponse(400, 'Invalid or expired reset token'));
    }

    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (tokenHash !== landlord.auth.reset_token_hash) {
      return reply.status(400).send(errorResponse(400, 'Invalid reset token'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.landlordAuth.update({
      where: { landlord_id: landlord.id },
      data: { password_hash: passwordHash, reset_token_hash: null, reset_token_expires_at: null },
    });

    return reply.send(successResponse({ message: 'Password has been reset successfully' }));
  });

  // ── POST /api/auth/refresh ────────────────────────────────────────────────────
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) {
      return reply.status(400).send(errorResponse(400, 'Refresh token required'));
    }

    try {
      const payload = fastify.jwt.verify<{ id: string; role: 'landlord' | 'tenant' }>(refreshToken);

      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const stored = await prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } });
      if (!stored || stored.expires_at < new Date()) {
        return reply.status(401).send(errorResponse(401, 'Invalid or expired refresh token'));
      }

      // Rotate: delete old, issue new
      await prisma.refreshToken.delete({ where: { token_hash: tokenHash } });
      const { accessToken, refreshToken: newRefreshToken } = issueTokens(fastify, {
        id: payload.id,
        role: payload.role,
      });

      const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
      await prisma.refreshToken.create({
        data: {
          landlord_id: payload.id,
          token_hash: newHash,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return reply.send(successResponse({ accessToken, refreshToken: newRefreshToken }));
    } catch {
      return reply.status(401).send(errorResponse(401, 'Invalid refresh token'));
    }
  });

  // ── POST /api/auth/logout ─────────────────────────────────────────────────────
  fastify.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (refreshToken) {
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.deleteMany({ where: { token_hash: tokenHash } }).catch(() => {});
    }
    return reply.send(successResponse({ message: 'Logged out successfully' }));
  });

  // ── POST /api/auth/tenant/register ───────────────────────────────────────────
  fastify.post('/tenant/register', async (request, reply) => {
    const registerSchema = z.object({
      phone: z.string().regex(/^\+91[6-9]\d{9}$/),
      name: z.string().min(2),
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
    });

    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { phone, name, email, password } = result.data;

    const existing = await prisma.tenant.findFirst({ where: { phone } });
    if (existing) {
      return reply.status(409).send(errorResponse(409, 'Tenant with this phone number already exists'));
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const tenant = await prisma.tenant.create({
      data: {
        phone,
        name,
        email,
        auth: { create: { password_hash: passwordHash } }
      }
    });

    return reply.status(201).send(successResponse(tenant, { message: 'Registration successful' }));
  });

  // ── POST /api/auth/tenant/login ──────────────────────────────────────────────
  fastify.post('/tenant/login', async (request, reply) => {
    const tenantLoginSchema = z.object({
      identifier: z.string(), // phone or email
      password: z.string().min(1),
    });

    const result = tenantLoginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { identifier, password } = result.data;
    const phoneTry = /^\d{10}$/.test(identifier) ? `+91${identifier}` : identifier;

    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ email: identifier }, { phone: phoneTry }] },
      include: { auth: true },
    });

    if (!tenant || !tenant.auth || !tenant.auth.password_hash) {
      return reply.status(401).send(errorResponse(401, 'Invalid credentials or no password set'));
    }

    const valid = await bcrypt.compare(password, tenant.auth.password_hash);
    if (!valid) {
      return reply.status(401).send(errorResponse(401, 'Invalid credentials'));
    }

    const { accessToken, refreshToken } = issueTokens(fastify, { id: tenant.id, role: 'tenant' });

    await prisma.tenantAuth.update({
      where: { tenant_id: tenant.id },
      data: { last_login_at: new Date() },
    });

    return reply.send(successResponse({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
      },
      accessToken,
      refreshToken,
    }));
  });

  // ── POST /api/auth/tenant/request-otp ────────────────────────────────────────
  fastify.post('/tenant/request-otp', async (request, reply) => {
    const result = requestOtpSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { phone } = result.data;

    const tenant = await prisma.tenant.findFirst({ where: { phone } });
    if (!tenant) {
      return reply.status(404).send(errorResponse(404, 'No tenant found with this phone number'));
    }

    const otp = generateOtp();
    const crypto = await import('crypto');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.tenantAuth.upsert({
      where: { tenant_id: tenant.id },
      update: { otp_hash: otpHash, otp_expires_at: otpExpiresAt },
      create: { tenant_id: tenant.id, otp_hash: otpHash, otp_expires_at: otpExpiresAt },
    });

    // Send OTP via Fast2SMS (falls back to console.log if API key not configured)
    try {
      await sendOtpSms(phone, otp);
    } catch (err) {
      console.error('[OTP] SMS delivery failed:', err);
      // Still return success in dev so login works without SMS credits
      if (process.env.NODE_ENV !== 'development') {
        return reply.status(500).send(errorResponse(500, 'Failed to send OTP. Please try again.'));
      }
    }

    // In development, return OTP directly in response for easy testing
    const devResponse = process.env.NODE_ENV === 'development' ? { otp } : {};

    return reply.send(successResponse({
      message: 'OTP sent to your WhatsApp / SMS',
      phone,
      expires_in: 600,
      ...devResponse,
    }));
  });

  // ── POST /api/auth/tenant/verify-otp ─────────────────────────────────────────
  fastify.post('/tenant/verify-otp', async (request, reply) => {
    const result = verifyOtpSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { phone, otp } = result.data;

    const tenant = await prisma.tenant.findFirst({
      where: { phone },
      include: { auth: true },
    });

    if (!tenant || !tenant.auth) {
      return reply.status(404).send(errorResponse(404, 'Tenant not found'));
    }

    if (!tenant.auth.otp_hash || !tenant.auth.otp_expires_at) {
      return reply.status(400).send(errorResponse(400, 'No OTP requested. Please request a new OTP.'));
    }

    if (tenant.auth.otp_expires_at < new Date()) {
      return reply.status(400).send(errorResponse(400, 'OTP has expired. Please request a new one.'));
    }

    const crypto = await import('crypto');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    if (otpHash !== tenant.auth.otp_hash) {
      return reply.status(401).send(errorResponse(401, 'Invalid OTP'));
    }

    // Clear OTP after successful verification
    await prisma.tenantAuth.update({
      where: { tenant_id: tenant.id },
      data: { otp_hash: null, otp_expires_at: null, last_login_at: new Date() },
    });

    const accessToken = fastify.jwt.sign(
      { id: tenant.id, role: 'tenant' },
      { expiresIn: '7d' }
    );

    return reply.send(successResponse({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
      },
      accessToken,
    }));
  });

  // ── POST /api/auth/tenant/forgot-password ────────────────────────────────────
  fastify.post('/tenant/forgot-password', async (request, reply) => {
    const result = forgotPasswordSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { email } = result.data;
    const tenant = await prisma.tenant.findFirst({ where: { email }, include: { auth: true } });
    
    if (!tenant) {
      return reply.send(successResponse({ message: 'If an account exists, a password reset link has been sent.' }));
    }

    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.tenantAuth.upsert({
      where: { tenant_id: tenant.id },
      update: { reset_token_hash: resetTokenHash, reset_token_expires_at: resetTokenExpiresAt },
      create: { tenant_id: tenant.id, password_hash: '', reset_token_hash: resetTokenHash, reset_token_expires_at: resetTokenExpiresAt }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${email}&role=tenant`;

    const { sendPasswordResetEmail } = await import('../utils/mailer');
    try {
      await sendPasswordResetEmail(email, resetLink, 'tenant');
    } catch (err) {
      fastify.log.error('Failed to send reset email: ' + err);
    }

    return reply.send(successResponse({ message: 'If an account exists, a password reset link has been sent.' }));
  });

  // ── POST /api/auth/tenant/reset-password ─────────────────────────────────────
  fastify.post('/tenant/reset-password', async (request, reply) => {
    const result = resetPasswordSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(errorResponse(400, result.error.errors[0].message));
    }

    const { email, token, password } = result.data;
    
    const tenant = await prisma.tenant.findFirst({ where: { email }, include: { auth: true } });
    if (!tenant || !tenant.auth) {
      return reply.status(400).send(errorResponse(400, 'Invalid token or account not found'));
    }

    if (!tenant.auth.reset_token_hash || !tenant.auth.reset_token_expires_at || tenant.auth.reset_token_expires_at < new Date()) {
      return reply.status(400).send(errorResponse(400, 'Invalid or expired reset token'));
    }

    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    if (tokenHash !== tenant.auth.reset_token_hash) {
      return reply.status(400).send(errorResponse(400, 'Invalid reset token'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.tenantAuth.update({
      where: { tenant_id: tenant.id },
      data: { password_hash: passwordHash, reset_token_hash: null, reset_token_expires_at: null },
    });

    return reply.send(successResponse({ message: 'Password has been reset successfully' }));
  });

  // ── GET /api/auth/landlord/me ──────────────────────────────────────────────
  fastify.get('/landlord/me', { preHandler: authenticateLandlord }, async (request, reply) => {
    const { id } = request.user as { id: string };
    const landlord = await prisma.landlord.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true,
        kyc_status: true, onboarding_done: true, preferred_lang: true,
        upi_id: true, subscription_tier: true, subscription_expires_at: true,
      },
    });
    if (!landlord) return reply.status(404).send(errorResponse(404, 'Not found'));
    return reply.send(successResponse(landlord));
  });
}
