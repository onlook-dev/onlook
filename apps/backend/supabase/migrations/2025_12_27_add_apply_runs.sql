-- PHASE 5: Add Apply Runs for Autonomous Ship Loop
-- Created: 2025-12-27
-- Purpose: Track GitHub PR creation and OpenHands repair loop for fix pack application

-- ============================================================
-- ENUMS
-- ============================================================

-- Apply run status enum
CREATE TYPE apply_run_status AS ENUM (
    'queued',
    'running',
    'branch_created',
    'pr_opened',
    'checks_running',
    'success',
    'failed'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Apply runs table
CREATE TABLE apply_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ownership
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- Source references
    audit_id UUID NOT NULL REFERENCES cynthia_audits(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fix_pack_id UUID NOT NULL REFERENCES fix_packs(id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- Status tracking
    status apply_run_status NOT NULL DEFAULT 'queued',

    -- GitHub integration
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    branch TEXT,
    pr_number INTEGER,
    pr_url TEXT,

    -- Execution logs and errors
    logs JSONB,
    error TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Apply runs indexes (per Phase 5 spec)
CREATE INDEX idx_apply_runs_user_id ON apply_runs(user_id);
CREATE INDEX idx_apply_runs_status ON apply_runs(status);
CREATE INDEX idx_apply_runs_created_at ON apply_runs(created_at);
CREATE INDEX idx_apply_runs_audit_id ON apply_runs(audit_id);
CREATE INDEX idx_apply_runs_fix_pack_id ON apply_runs(fix_pack_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on apply_runs
ALTER TABLE apply_runs ENABLE ROW LEVEL SECURITY;

-- Apply runs: Users can view their own apply runs
CREATE POLICY "apply_runs_select_own_policy" ON apply_runs
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Apply runs: No public insert (only system via SECURITY DEFINER function)
CREATE POLICY "apply_runs_insert_policy" ON apply_runs
FOR INSERT TO authenticated
WITH CHECK (false); -- System only

-- Apply runs: No public update (only system via SECURITY DEFINER function)
CREATE POLICY "apply_runs_update_policy" ON apply_runs
FOR UPDATE TO authenticated
USING (false); -- System only

-- ============================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================

-- Function: Create apply run record (with ownership validation)
CREATE OR REPLACE FUNCTION create_apply_run_record(
    p_user_id UUID,
    p_audit_id UUID,
    p_fix_pack_id UUID,
    p_repo_owner TEXT,
    p_repo_name TEXT
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_id UUID,
    audit_id UUID,
    fix_pack_id UUID,
    status apply_run_status,
    repo_owner TEXT,
    repo_name TEXT,
    branch TEXT,
    pr_number INTEGER,
    pr_url TEXT,
    logs JSONB,
    error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_audit RECORD;
    v_fix_pack RECORD;
BEGIN
    -- Validate caller is creating their own apply run
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot create apply run for other users';
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

    -- Verify fix pack exists and belongs to user
    SELECT * INTO v_fix_pack
    FROM fix_packs
    WHERE fix_packs.id = p_fix_pack_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fix pack not found';
    END IF;

    IF v_fix_pack.user_id != p_user_id THEN
        RAISE EXCEPTION 'Fix pack does not belong to user';
    END IF;

    -- Insert apply run
    RETURN QUERY
    INSERT INTO apply_runs (
        user_id,
        audit_id,
        fix_pack_id,
        repo_owner,
        repo_name,
        status
    )
    VALUES (
        p_user_id,
        p_audit_id,
        p_fix_pack_id,
        p_repo_owner,
        p_repo_name,
        'queued'
    )
    RETURNING *;
END;
$$;

-- Function: Update apply run status (with ownership validation)
CREATE OR REPLACE FUNCTION update_apply_run_status(
    p_apply_run_id UUID,
    p_user_id UUID,
    p_status apply_run_status,
    p_branch TEXT DEFAULT NULL,
    p_pr_number INTEGER DEFAULT NULL,
    p_pr_url TEXT DEFAULT NULL,
    p_logs JSONB DEFAULT NULL,
    p_error TEXT DEFAULT NULL
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
    v_apply_run RECORD;
BEGIN
    -- Validate caller is updating their own apply run
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot update other users apply runs';
    END IF;

    -- Get apply run and verify ownership
    SELECT * INTO v_apply_run
    FROM apply_runs
    WHERE apply_runs.id = p_apply_run_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Apply run not found';
    END IF;

    IF v_apply_run.user_id != p_user_id THEN
        RAISE EXCEPTION 'Apply run does not belong to user';
    END IF;

    -- Update apply run
    UPDATE apply_runs
    SET
        status = p_status,
        branch = COALESCE(p_branch, apply_runs.branch),
        pr_number = COALESCE(p_pr_number, apply_runs.pr_number),
        pr_url = COALESCE(p_pr_url, apply_runs.pr_url),
        logs = COALESCE(p_logs, apply_runs.logs),
        error = COALESCE(p_error, apply_runs.error),
        updated_at = now()
    WHERE apply_runs.id = p_apply_run_id;

    RETURN QUERY
    SELECT
        TRUE,
        format('Apply run updated to status: %s', p_status)::TEXT;
END;
$$;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================

-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION create_apply_run_record(UUID, UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_apply_run_status(UUID, UUID, apply_run_status, TEXT, INTEGER, TEXT, JSONB, TEXT) TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE apply_runs IS 'Phase 5: Tracks autonomous fix pack application via GitHub PR + OpenHands repair loop';

COMMENT ON COLUMN apply_runs.status IS 'Apply run status: queued → running → branch_created → pr_opened → checks_running → success/failed';
COMMENT ON COLUMN apply_runs.repo_owner IS 'GitHub repository owner (user or org)';
COMMENT ON COLUMN apply_runs.repo_name IS 'GitHub repository name';
COMMENT ON COLUMN apply_runs.branch IS 'Git branch name created for the fix pack';
COMMENT ON COLUMN apply_runs.pr_number IS 'GitHub pull request number';
COMMENT ON COLUMN apply_runs.pr_url IS 'GitHub pull request URL';
COMMENT ON COLUMN apply_runs.logs IS 'Execution logs array: [{ timestamp, message, level }]';
COMMENT ON COLUMN apply_runs.error IS 'Error message if status = failed';

COMMENT ON FUNCTION create_apply_run_record IS 'Phase 5: Creates apply run with audit and fix pack ownership validation';
COMMENT ON FUNCTION update_apply_run_status IS 'Phase 5: Updates apply run status with ownership validation';
