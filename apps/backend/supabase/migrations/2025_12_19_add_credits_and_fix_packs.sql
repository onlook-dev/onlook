-- PHASE 4: Add Credit Balances and Fix Packs
-- Created: 2025-12-19
-- Purpose: Monetization, credits, and Fix Pack application

-- ============================================================
-- ENUMS
-- ============================================================

-- Cynthia plan enum
CREATE TYPE cynthia_plan AS ENUM (
    'free',
    'starter',
    'pro',
    'agency'
);

-- Fix pack type enum
CREATE TYPE fix_pack_type AS ENUM (
    'token',
    'layout',
    'component',
    'motion',
    'content'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Credit balances table
CREATE TABLE credit_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    plan cynthia_plan NOT NULL DEFAULT 'free',
    monthly_credits INTEGER NOT NULL DEFAULT 0,
    used_credits INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL
);

-- Fix packs table
CREATE TABLE fix_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    audit_id UUID NOT NULL REFERENCES cynthia_audits(id) ON DELETE CASCADE ON UPDATE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    type fix_pack_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    patch_preview JSONB NOT NULL,
    files_affected JSONB NOT NULL,
    issues_fixed JSONB NOT NULL,
    applied_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Credit balances indexes
CREATE INDEX idx_credit_balances_user_id ON credit_balances(user_id);
CREATE INDEX idx_credit_balances_reset_at ON credit_balances(reset_at);

-- Fix packs indexes
CREATE INDEX idx_fix_packs_audit_id ON fix_packs(audit_id);
CREATE INDEX idx_fix_packs_user_id ON fix_packs(user_id);
CREATE INDEX idx_fix_packs_type ON fix_packs(type);
CREATE INDEX idx_fix_packs_applied_at ON fix_packs(applied_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on credit_balances
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;

-- Credit balances: Users can view their own balance
CREATE POLICY "credit_balances_select_own_policy" ON credit_balances
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Credit balances: No public insert (only system/admin)
CREATE POLICY "credit_balances_insert_policy" ON credit_balances
FOR INSERT TO authenticated
WITH CHECK (false); -- System only

-- Credit balances: No public update (only system/admin)
CREATE POLICY "credit_balances_update_policy" ON credit_balances
FOR UPDATE TO authenticated
USING (false); -- System only

-- Enable RLS on fix_packs
ALTER TABLE fix_packs ENABLE ROW LEVEL SECURITY;

-- Fix packs: Users can view their own fix packs
CREATE POLICY "fix_packs_select_own_policy" ON fix_packs
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Fix packs: No public insert (only system)
CREATE POLICY "fix_packs_insert_policy" ON fix_packs
FOR INSERT TO authenticated
WITH CHECK (false); -- System only

-- Fix packs: No public update
CREATE POLICY "fix_packs_update_policy" ON fix_packs
FOR UPDATE TO authenticated
USING (false); -- System only

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to reset monthly credits (for cron job)
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE credit_balances
    SET
        used_credits = 0,
        reset_at = reset_at + INTERVAL '1 month',
        updated_at = now()
    WHERE reset_at <= now();
END;
$$;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE credit_balances IS 'Phase 4: Tracks Cynthia Build My Site credit balances per user';
COMMENT ON TABLE fix_packs IS 'Phase 4: Stores generated fix packs from Cynthia audits';

COMMENT ON COLUMN credit_balances.plan IS 'Cynthia plan tier: free (0), starter (10), pro (50), agency (200)';
COMMENT ON COLUMN credit_balances.monthly_credits IS 'Total credits allocated per month based on plan';
COMMENT ON COLUMN credit_balances.used_credits IS 'Credits consumed in current period';
COMMENT ON COLUMN credit_balances.reset_at IS 'Next monthly reset date';

COMMENT ON COLUMN fix_packs.type IS 'Fix pack type: token, layout, component, motion, or content';
COMMENT ON COLUMN fix_packs.patch_preview IS 'Code diff preview (read-only in Phase 4)';
COMMENT ON COLUMN fix_packs.applied_at IS 'NULL = not applied yet, timestamp = applied (Phase 5 will populate)';
