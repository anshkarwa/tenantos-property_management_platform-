-- Run this in Supabase SQL Editor OR run: npx prisma db push  (in backend folder)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_referral_code_key ON tenants(referral_code) WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referrals (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id     TEXT NOT NULL REFERENCES tenants(id),
  referred_id     TEXT UNIQUE REFERENCES tenants(id),
  referred_phone  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  reward_amount   INT  NOT NULL DEFAULT 200,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
