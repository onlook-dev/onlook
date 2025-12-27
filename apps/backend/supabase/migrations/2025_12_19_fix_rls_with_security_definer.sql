-- PHASE 4.1: Fix RLS Policy Issue with SECURITY DEFINER Functions
-- Created: 2025-12-19
-- Purpose: Enable app to manage credits/fix-packs without bypassing RLS

-- ============================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================

-- Function: Ensure credit balance exists (auto-create free tier)
CREATE OR REPLACE FUNCTION ensure_credit_balance(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    plan cynthia_plan,
    monthly_credits INT,
    used_credits INT,
    reset_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance RECORD;
BEGIN
    -- Validate caller is requesting their own balance
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot access other users credit balance';
    END IF;

    -- Try to get existing balance
    SELECT * INTO v_balance
    FROM credit_balances
    WHERE credit_balances.user_id = p_user_id;

    -- If exists, return it
    IF FOUND THEN
        RETURN QUERY
        SELECT
            v_balance.id,
            v_balance.user_id,
            v_balance.plan,
            v_balance.monthly_credits,
            v_balance.used_credits,
            v_balance.reset_at,
            v_balance.created_at,
            v_balance.updated_at;
        RETURN;
    END IF;

    -- Create new balance (free tier)
    RETURN QUERY
    INSERT INTO credit_balances (user_id, plan, monthly_credits, used_credits, reset_at)
    VALUES (
        p_user_id,
        'free',
        0,
        0,
        now() + INTERVAL '1 month'
    )
    RETURNING *;
END;
$$;

-- Function: Consume credits atomically
CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID, p_amount INT DEFAULT 1)
RETURNS TABLE (
    success BOOLEAN,
    remaining INT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance RECORD;
    v_remaining INT;
BEGIN
    -- Validate caller is consuming their own credits
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot consume other users credits';
    END IF;

    -- Validate amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Lock row and get current balance
    SELECT * INTO v_balance
    FROM credit_balances
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- If no balance exists, create free tier first
    IF NOT FOUND THEN
        PERFORM ensure_credit_balance(p_user_id);
        SELECT * INTO v_balance
        FROM credit_balances
        WHERE user_id = p_user_id
        FOR UPDATE;
    END IF;

    -- Calculate remaining
    v_remaining := v_balance.monthly_credits - v_balance.used_credits;

    -- Check if sufficient credits
    IF v_remaining < p_amount THEN
        RETURN QUERY
        SELECT
            FALSE,
            v_remaining,
            format('Insufficient credits. Have %s, need %s', v_remaining, p_amount);
        RETURN;
    END IF;

    -- Consume credits
    UPDATE credit_balances
    SET
        used_credits = used_credits + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

    RETURN QUERY
    SELECT
        TRUE,
        v_remaining - p_amount,
        'Credits consumed successfully'::TEXT;
END;
$$;

-- Function: Update user plan (called on subscription change)
CREATE OR REPLACE FUNCTION update_user_plan(
    p_user_id UUID,
    p_new_plan cynthia_plan
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_credits INT;
BEGIN
    -- Validate caller is updating their own plan
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot update other users plan';
    END IF;

    -- Get credit allocation for new plan
    v_new_credits := CASE p_new_plan
        WHEN 'free' THEN 0
        WHEN 'starter' THEN 10
        WHEN 'pro' THEN 50
        WHEN 'agency' THEN 200
        ELSE 0
    END;

    -- Ensure balance exists
    PERFORM ensure_credit_balance(p_user_id);

    -- Update plan and reset credits
    UPDATE credit_balances
    SET
        plan = p_new_plan,
        monthly_credits = v_new_credits,
        used_credits = 0,
        reset_at = now() + INTERVAL '1 month',
        updated_at = now()
    WHERE user_id = p_user_id;

    RETURN QUERY
    SELECT
        TRUE,
        format('Plan updated to %s with %s credits', p_new_plan, v_new_credits)::TEXT;
END;
$$;

-- Function: Create fix pack (with ownership validation)
CREATE OR REPLACE FUNCTION create_fix_pack_record(
    p_user_id UUID,
    p_audit_id UUID,
    p_type fix_pack_type,
    p_title TEXT,
    p_description TEXT,
    p_patch_preview JSONB,
    p_files_affected JSONB,
    p_issues_fixed JSONB
)
RETURNS TABLE (
    id UUID,
    audit_id UUID,
    user_id UUID,
    type fix_pack_type,
    title TEXT,
    description TEXT,
    patch_preview JSONB,
    files_affected JSONB,
    issues_fixed JSONB,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_audit RECORD;
BEGIN
    -- Validate caller is creating their own fix pack
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot create fix pack for other users';
    END IF;

    -- Verify audit exists and belongs to user
    SELECT * INTO v_audit
    FROM cynthia_audits
    WHERE cynthia_audits.id = p_audit_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit not found';
    END IF;

    IF v_audit.user_id != p_user_id THEN
        RAISE EXCEPTION 'Audit does not belong to user';
    END IF;

    -- Insert fix pack
    RETURN QUERY
    INSERT INTO fix_packs (
        user_id,
        audit_id,
        type,
        title,
        description,
        patch_preview,
        files_affected,
        issues_fixed
    )
    VALUES (
        p_user_id,
        p_audit_id,
        p_type,
        p_title,
        p_description,
        p_patch_preview,
        p_files_affected,
        p_issues_fixed
    )
    RETURNING *;
END;
$$;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================

-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION ensure_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_credit(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_plan(UUID, cynthia_plan) TO authenticated;
GRANT EXECUTE ON FUNCTION create_fix_pack_record(UUID, UUID, fix_pack_type, TEXT, TEXT, JSONB, JSONB, JSONB) TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON FUNCTION ensure_credit_balance(UUID) IS 'Phase 4.1: Auto-creates free tier balance, callable by authenticated users (self only)';
COMMENT ON FUNCTION consume_credit(UUID, INT) IS 'Phase 4.1: Atomically decrements credits with ownership validation';
COMMENT ON FUNCTION update_user_plan(UUID, cynthia_plan) IS 'Phase 4.1: Updates plan tier on subscription change (self only)';
COMMENT ON FUNCTION create_fix_pack_record IS 'Phase 4.1: Creates fix pack with audit ownership validation';
