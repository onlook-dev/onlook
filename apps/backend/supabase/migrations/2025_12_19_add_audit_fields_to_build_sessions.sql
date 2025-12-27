-- PHASE 3: Add Audit Fields to Build Sessions
-- Created: 2025-12-19
-- Purpose: Wire build sessions to real Cynthia audits

-- ============================================================
-- ENUMS
-- ============================================================

-- Build session audit status enum
CREATE TYPE build_session_audit_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed'
);

-- ============================================================
-- ALTER TABLES
-- ============================================================

-- Add audit fields to build_sessions
ALTER TABLE build_sessions
ADD COLUMN audit_id UUID REFERENCES cynthia_audits(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD COLUMN audit_status build_session_audit_status DEFAULT 'pending';

-- ============================================================
-- INDEXES
-- ============================================================

-- Index on build_sessions.audit_id for audit lookups
CREATE INDEX idx_build_sessions_audit_id ON build_sessions(audit_id);

-- Index on build_sessions.audit_status for filtering by status
CREATE INDEX idx_build_sessions_audit_status ON build_sessions(audit_status);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON COLUMN build_sessions.audit_id IS 'Phase 3: Links to real Cynthia audit (nullable until audit completes)';
COMMENT ON COLUMN build_sessions.audit_status IS 'Phase 3: Tracks audit processing state (pending → running → completed/failed)';
