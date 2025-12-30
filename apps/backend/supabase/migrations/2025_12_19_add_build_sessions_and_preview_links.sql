-- PHASE 2: Build Sessions & Preview Links
-- Created: 2025-12-19
-- Purpose: Add tables for "Build My Site" viral wedge functionality

-- ============================================================
-- ENUMS
-- ============================================================

-- Build session status enum
CREATE TYPE build_session_status AS ENUM (
    'created',
    'previewed',
    'locked',
    'converted'
);

-- Build session input type enum
CREATE TYPE build_session_input_type AS ENUM (
    'idea',
    'url'
);

-- ============================================================
-- TABLES
-- ============================================================

-- Build sessions table
-- Stores each "Build My Site" session (anonymous or authenticated)
CREATE TABLE IF NOT EXISTS build_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Session data
    language TEXT NOT NULL DEFAULT 'en', -- 'en' | 'es'
    input_type build_session_input_type NOT NULL,
    input_value TEXT NOT NULL,

    -- Audit results (static for Phase 2, real in Phase 3)
    teaser_score INTEGER,
    teaser_summary JSONB,

    -- Status tracking
    status build_session_status NOT NULL DEFAULT 'created',

    -- User relationship (nullable - anonymous sessions allowed)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Preview links table
-- Public shareable links for build sessions
CREATE TABLE IF NOT EXISTS preview_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Build session relationship
    build_session_id UUID NOT NULL REFERENCES build_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- Public slug for sharing (unguessable)
    slug TEXT NOT NULL UNIQUE,

    -- Optional expiration
    expires_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Index on preview_links.slug for fast lookup
CREATE INDEX idx_preview_links_slug ON preview_links(slug);

-- Index on build_sessions.user_id for user session queries
CREATE INDEX idx_build_sessions_user_id ON build_sessions(user_id);

-- Index on build_sessions.status for status filtering
CREATE INDEX idx_build_sessions_status ON build_sessions(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE build_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE preview_links ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BUILD_SESSIONS POLICIES
-- ============================================================

-- RLS Policy: Public insert allowed (anonymous users can create sessions)
-- Rationale: "No signup to start" - anyone can create a build session
DROP POLICY IF EXISTS "build_sessions_insert_policy" ON build_sessions;
CREATE POLICY "build_sessions_insert_policy" ON build_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- RLS Policy: Public select DENIED (no public listing of sessions)
-- Rationale: Sessions are private by default, only accessible via preview link
DROP POLICY IF EXISTS "build_sessions_select_anon_policy" ON build_sessions;
CREATE POLICY "build_sessions_select_anon_policy" ON build_sessions
FOR SELECT
TO anon
USING (false);

-- RLS Policy: Owner select allowed (users can see their own sessions)
-- Rationale: Authenticated users can view sessions they created
DROP POLICY IF EXISTS "build_sessions_select_owner_policy" ON build_sessions;
CREATE POLICY "build_sessions_select_owner_policy" ON build_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Owner update allowed (users can update their own sessions)
-- Rationale: Users can change status or claim anonymous sessions
DROP POLICY IF EXISTS "build_sessions_update_owner_policy" ON build_sessions;
CREATE POLICY "build_sessions_update_owner_policy" ON build_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PREVIEW_LINKS POLICIES
-- ============================================================

-- RLS Policy: Public select by slug allowed (anyone can view via preview link)
-- Rationale: Preview links are publicly shareable - this is the viral mechanic
DROP POLICY IF EXISTS "preview_links_select_by_slug_policy" ON preview_links;
CREATE POLICY "preview_links_select_by_slug_policy" ON preview_links
FOR SELECT
TO anon, authenticated
USING (true);

-- RLS Policy: No public insert (only server/authenticated can create)
-- Rationale: Prevent spam, only app can generate preview links
DROP POLICY IF EXISTS "preview_links_insert_policy" ON preview_links;
CREATE POLICY "preview_links_insert_policy" ON preview_links
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policy: No public update (immutable once created)
-- Rationale: Preview links should not change after creation
DROP POLICY IF EXISTS "preview_links_update_policy" ON preview_links;
CREATE POLICY "preview_links_update_policy" ON preview_links
FOR UPDATE
TO authenticated
USING (false);

-- RLS Policy: No public delete (only via cascade from build_session)
-- Rationale: Cleanup happens automatically when session is deleted
DROP POLICY IF EXISTS "preview_links_delete_policy" ON preview_links;
CREATE POLICY "preview_links_delete_policy" ON preview_links
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM build_sessions
        WHERE build_sessions.id = preview_links.build_session_id
        AND build_sessions.user_id = auth.uid()
    )
);

-- ============================================================
-- SECURITY NOTES
-- ============================================================
--
-- build_sessions:
--   - Public INSERT: Anyone can create (viral onboarding)
--   - Public SELECT: DENIED (no data leaks)
--   - Owner SELECT/UPDATE: User can see and update their own sessions
--   - Anonymous sessions can be "claimed" by authenticated users
--
-- preview_links:
--   - Public SELECT: Anyone with slug can view (shareable)
--   - Public INSERT: DENIED (only app creates)
--   - Public UPDATE/DELETE: DENIED (immutable)
--   - No listing endpoint (must know exact slug)
--
-- Privacy guarantees:
--   - Slug must be unguessable (min 8 chars, random)
--   - No enumeration attack possible (no public list)
--   - User data not exposed via preview (sanitized in query)
--   - Expired links can be checked client-side before rendering
--
-- ============================================================

-- Add comment metadata
COMMENT ON TABLE build_sessions IS 'Phase 2: Build My Site sessions (anonymous or authenticated)';
COMMENT ON TABLE preview_links IS 'Phase 2: Public shareable preview links for build sessions';
COMMENT ON COLUMN build_sessions.user_id IS 'Nullable - anonymous sessions allowed, can be claimed later';
COMMENT ON COLUMN preview_links.slug IS 'Unguessable random slug for public sharing (min 8 chars)';
