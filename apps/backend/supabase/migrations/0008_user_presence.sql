CREATE TABLE IF NOT EXISTS public.user_presence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    is_online boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presence for accessible projects" ON public.user_presence
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_projects
            WHERE user_projects.project_id = user_presence.project_id
            AND user_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own presence" ON public.user_presence
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_user_presence(
    p_project_id uuid,
    p_user_id uuid,
    p_is_online boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_presence (project_id, user_id, is_online, last_seen, updated_at)
    VALUES (p_project_id, p_user_id, p_is_online, now(), now())
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET
        is_online = p_is_online,
        last_seen = now(),
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_offline_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_presence
    SET is_online = false, updated_at = now()
    WHERE is_online = true
    AND last_seen < now() - interval '5 minutes';
END;
$$;

CREATE OR REPLACE FUNCTION public.presence_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    topic_project_id uuid;
BEGIN
    topic_project_id := COALESCE(NEW.project_id, OLD.project_id);

    IF topic_project_id IS NOT NULL THEN
        PERFORM realtime.broadcast_changes(
            'presence:' || topic_project_id::text,
            TG_OP,
            TG_OP,
            TG_TABLE_NAME,
            TG_TABLE_SCHEMA,
            NEW,
            OLD
        );
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS handle_presence_changes ON public.user_presence;
CREATE TRIGGER handle_presence_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.user_presence
FOR EACH ROW
EXECUTE FUNCTION presence_changes();

DROP POLICY IF EXISTS "Authenticated users can receive presence broadcasts" ON "realtime"."messages";
CREATE POLICY "Authenticated users can receive presence broadcasts"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING (
    CASE
        WHEN payload->>'table' = 'user_presence' THEN
            EXISTS (
                SELECT 1 FROM public.user_projects
                WHERE user_projects.project_id = (payload->>'project_id')::uuid
                AND user_projects.user_id = auth.uid()
            )
        ELSE false
    END
);
