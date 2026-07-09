-- Audit logging function for security events
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID,
    resource_type TEXT,
    resource_id UUID,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID DEFAULT auth.uid()
);

-- Create index on audit_logs for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);

-- Helper function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    event_type TEXT,
    action TEXT,
    resource_type TEXT DEFAULT NULL,
    resource_id UUID DEFAULT NULL,
    details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (event_type, user_id, resource_type, resource_id, action, details, created_by)
  VALUES (event_type, auth.uid(), resource_type, resource_id, action, details, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has specific roles for a project
CREATE OR REPLACE FUNCTION user_has_project_access(
  project_id_param UUID,
  required_roles TEXT[]
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_projects.project_id = project_id_param
    AND user_projects.user_id = auth.uid()
    AND user_projects.role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has project access via canvas
CREATE OR REPLACE FUNCTION user_has_canvas_access(
  canvas_id_param UUID,
  required_roles TEXT[]
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM canvas c
    JOIN user_projects up ON c.project_id = up.project_id
    WHERE c.id = canvas_id_param
    AND up.user_id = auth.uid()
    AND up.role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROJECTS POLICIES
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;

-- 1. INSERT: Allow only authenticated users to create projects
CREATE POLICY "projects_insert_policy" ON projects
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "projects_select_policy" ON projects;

-- 2. SELECT: Allow users who have an entry in user_projects for that project
CREATE POLICY "projects_select_policy" ON projects
FOR SELECT
TO authenticated
USING (user_has_project_access(projects.id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "projects_update_policy" ON projects;

-- 3. UPDATE: Allow users with 'owner' or 'admin' role in user_projects
CREATE POLICY "projects_update_policy" ON projects
FOR UPDATE
TO authenticated
USING (user_has_project_access(projects.id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

-- 4. DELETE: Allow only users with 'owner' role
CREATE POLICY "projects_delete_policy" ON projects
FOR DELETE
TO authenticated
USING (user_has_project_access(projects.id, ARRAY['owner']));

-- CANVAS POLICIES
DROP POLICY IF EXISTS "canvas_insert_policy" ON canvas;

-- 1. INSERT: Allow only users with 'owner' role to create canvas entries
CREATE POLICY "canvas_insert_policy" ON canvas
FOR INSERT
TO authenticated
WITH CHECK (user_has_project_access(canvas.project_id, ARRAY['owner']));

DROP POLICY IF EXISTS "canvas_select_policy" ON canvas;
-- 2. SELECT: Allow users who have an entry in user_projects for the canvas's project
CREATE POLICY "canvas_select_policy" ON canvas
FOR SELECT
TO authenticated
USING (user_has_project_access(canvas.project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "canvas_deny_select_policy" ON canvas;
-- Deny SELECT access to unauthenticated users
CREATE POLICY "canvas_deny_select_policy" ON canvas
FOR SELECT
TO public
USING (false);

DROP POLICY IF EXISTS "canvas_update_policy" ON canvas;
-- 3. UPDATE: Allow users with 'owner' or 'admin' role in user_projects for the canvas's project
CREATE POLICY "canvas_update_policy" ON canvas
FOR UPDATE
TO authenticated
USING (user_has_project_access(canvas.project_id, ARRAY['owner', 'admin']))
WITH CHECK (user_has_project_access(canvas.project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "canvas_delete_policy" ON canvas;
-- 4. DELETE: Allow only users with 'owner' role for the canvas's project
CREATE POLICY "canvas_delete_policy" ON canvas
FOR DELETE
TO authenticated
USING (user_has_project_access(canvas.project_id, ARRAY['owner']));

-- USER_PROJECTS POLICIES
DROP POLICY IF EXISTS "user_projects_select_policy" ON user_projects;
-- 1. SELECT: Allow users to see their own entries or project owners/admins to see all entries
CREATE POLICY "user_projects_select_policy" ON user_projects
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_projects.user_id OR 
  user_has_project_access(user_projects.project_id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "user_projects_update_policy" ON user_projects;
-- 2. UPDATE: Allow only project owners/admins to update user roles
CREATE POLICY "user_projects_update_policy" ON user_projects
FOR UPDATE
TO authenticated
USING (user_has_project_access(user_projects.project_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "user_projects_delete_policy" ON user_projects;
-- 3. DELETE: Allow users to remove themselves or project owners to remove anyone
CREATE POLICY "user_projects_delete_policy" ON user_projects
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_projects.user_id OR 
  user_has_project_access(user_projects.project_id, ARRAY['owner'])
);

-- USER_CANVASES POLICIES
DROP POLICY IF EXISTS "user_canvases_insert_policy" ON user_canvases;
-- 1. INSERT: Allow users to create their own canvas associations
CREATE POLICY "user_canvases_insert_policy" ON user_canvases
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_canvases.user_id
);

DROP POLICY IF EXISTS "user_canvases_select_policy" ON user_canvases;
-- 2. SELECT: Allow users to see only their own canvas associations
CREATE POLICY "user_canvases_select_policy" ON user_canvases
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_canvases.user_id
);

DROP POLICY IF EXISTS "user_canvases_update_policy" ON user_canvases;
-- 3. UPDATE: Allow users to update only their own canvas associations
CREATE POLICY "user_canvases_update_policy" ON user_canvases
FOR UPDATE
TO authenticated
USING (auth.uid() = user_canvases.user_id)
WITH CHECK (auth.uid() = user_canvases.user_id);

DROP POLICY IF EXISTS "user_canvases_delete_policy" ON user_canvases;
-- 4. DELETE: Allow users to delete only their own canvas associations
CREATE POLICY "user_canvases_delete_policy" ON user_canvases
FOR DELETE
TO authenticated
USING (auth.uid() = user_canvases.user_id);

-- FRAMES POLICIES
DROP POLICY IF EXISTS "frames_insert_policy" ON frames;
-- 1. INSERT: Allow project owners/admins to create frames
CREATE POLICY "frames_insert_policy" ON frames
FOR INSERT
TO authenticated
WITH CHECK (user_has_canvas_access(frames.canvas_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "frames_select_policy" ON frames;
-- 2. SELECT: Allow project owners/admins to view frames
CREATE POLICY "frames_select_policy" ON frames
FOR SELECT
TO authenticated
USING (user_has_canvas_access(frames.canvas_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "frames_update_policy" ON frames;
-- 3. UPDATE: Allow project owners/admins to update frames
CREATE POLICY "frames_update_policy" ON frames
FOR UPDATE
TO authenticated
USING (user_has_canvas_access(frames.canvas_id, ARRAY['owner', 'admin']))
WITH CHECK (user_has_canvas_access(frames.canvas_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "frames_delete_policy" ON frames;
-- 4. DELETE: Allow project owners/admins to delete frames
CREATE POLICY "frames_delete_policy" ON frames
FOR DELETE
TO authenticated
USING (user_has_canvas_access(frames.canvas_id, ARRAY['owner', 'admin']));

-- USERS POLICIES
DROP POLICY IF EXISTS "users_insert_policy" ON users;
-- 1. INSERT: Allow users to create their own user record
CREATE POLICY "users_insert_policy" ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = users.id);

DROP POLICY IF EXISTS "users_select_policy" ON users;
-- 2. SELECT: Allow users to view only their own user record
CREATE POLICY "users_select_policy" ON users
FOR SELECT
TO authenticated
USING (auth.uid() = users.id);

DROP POLICY IF EXISTS "users_update_policy" ON users;
-- 3. UPDATE: Allow users to update only their own user record
CREATE POLICY "users_update_policy" ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = users.id)
WITH CHECK (auth.uid() = users.id);

DROP POLICY IF EXISTS "users_delete_policy" ON users;
-- 4. DELETE: Allow users to delete only their own user record
CREATE POLICY "users_delete_policy" ON users
FOR DELETE
TO authenticated
USING (auth.uid() = users.id);

-- USER_SETTINGS POLICIES
DROP POLICY IF EXISTS "user_settings_insert_policy" ON user_settings;
-- 1. INSERT: Allow users to create their own settings
CREATE POLICY "user_settings_insert_policy" ON user_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_settings.user_id);

DROP POLICY IF EXISTS "user_settings_select_policy" ON user_settings;
-- 2. SELECT: Allow users to view only their own settings
CREATE POLICY "user_settings_select_policy" ON user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_settings.user_id);

DROP POLICY IF EXISTS "user_settings_update_policy" ON user_settings;
-- 3. UPDATE: Allow users to update only their own settings
CREATE POLICY "user_settings_update_policy" ON user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_settings.user_id)
WITH CHECK (auth.uid() = user_settings.user_id);

DROP POLICY IF EXISTS "user_settings_delete_policy" ON user_settings;
-- 4. DELETE: Allow users to delete only their own settings
CREATE POLICY "user_settings_delete_policy" ON user_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_settings.user_id);

-- PROJECT_INVITATIONS POLICIES
DROP POLICY IF EXISTS "project_invitations_insert_policy" ON project_invitations;
-- 1. INSERT: Allow project owners/admins to send invitations
CREATE POLICY "project_invitations_insert_policy" ON project_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = project_invitations.inviter_id AND
  user_has_project_access(project_invitations.project_id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "project_invitations_select_policy" ON project_invitations;
-- 2. SELECT: Allow project owners/admins and invitees to view invitations
CREATE POLICY "project_invitations_select_policy" ON project_invitations
FOR SELECT
TO authenticated
USING (
  user_has_project_access(project_invitations.project_id, ARRAY['owner', 'admin']) OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = project_invitations.invitee_email
  )
);

DROP POLICY IF EXISTS "project_invitations_update_policy" ON project_invitations;
-- 3. UPDATE: Allow project owners/admins and invitees to update invitations
CREATE POLICY "project_invitations_update_policy" ON project_invitations
FOR UPDATE
TO authenticated
USING (
  user_has_project_access(project_invitations.project_id, ARRAY['owner', 'admin']) OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = project_invitations.invitee_email
  )
)
WITH CHECK (
  user_has_project_access(project_invitations.project_id, ARRAY['owner', 'admin']) OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = project_invitations.invitee_email
  )
);

DROP POLICY IF EXISTS "project_invitations_delete_policy" ON project_invitations;
-- 4. DELETE: Allow inviters, project owners/admins, and invitees to delete invitations
CREATE POLICY "project_invitations_delete_policy" ON project_invitations
FOR DELETE
TO authenticated
USING (
  auth.uid() = project_invitations.inviter_id OR
  user_has_project_access(project_invitations.project_id, ARRAY['owner', 'admin']) OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = project_invitations.invitee_email
  )
);

