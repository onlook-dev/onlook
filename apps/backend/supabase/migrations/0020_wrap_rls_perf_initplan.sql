-- Wrap every unwrapped auth.* call (USING + WITH CHECK, including calls nested inside
-- EXISTS/correlated subqueries) in (select ...) so Postgres evaluates each once per
-- statement (an InitPlan) instead of once per row -- the Supabase-documented RLS perf
-- pattern. Predicate-equivalent (row visibility unchanged). Already-wrapped calls left as-is.

ALTER POLICY "file_transfer_delete_policy" ON storage.objects
    USING (((bucket_id = 'file_transfer'::text) AND ((select auth.uid()) = owner)));

ALTER POLICY "file_transfer_insert_policy" ON storage.objects
    WITH CHECK (((bucket_id = 'file_transfer'::text) AND ((select auth.uid()) = owner)));

ALTER POLICY "file_transfer_select_policy" ON storage.objects
    USING (((bucket_id = 'file_transfer'::text) AND ((select auth.uid()) = owner)));

ALTER POLICY "project_invitations_delete_policy" ON public.project_invitations
    USING ((((select auth.uid()) = inviter_id) OR user_has_project_access(project_id, ARRAY['owner'::text, 'admin'::text]) OR (EXISTS ( SELECT 1 FROM auth.users WHERE ((users.id = (select auth.uid())) AND (users.email = (project_invitations.invitee_email)::text))))));

ALTER POLICY "project_invitations_insert_policy" ON public.project_invitations
    WITH CHECK ((((select auth.uid()) = inviter_id) AND user_has_project_access(project_id, ARRAY['owner'::text, 'admin'::text])));

ALTER POLICY "project_invitations_select_policy" ON public.project_invitations
    USING ((user_has_project_access(project_id, ARRAY['owner'::text, 'admin'::text]) OR (EXISTS ( SELECT 1 FROM auth.users WHERE ((users.id = (select auth.uid())) AND (users.email = (project_invitations.invitee_email)::text))))));

ALTER POLICY "project_invitations_update_policy" ON public.project_invitations
    USING ((user_has_project_access(project_id, ARRAY['owner'::text, 'admin'::text]) OR (EXISTS ( SELECT 1 FROM auth.users WHERE ((users.id = (select auth.uid())) AND (users.email = (project_invitations.invitee_email)::text))))))
    WITH CHECK ((user_has_project_access(project_id, ARRAY['owner'::text, 'admin'::text]) OR (EXISTS ( SELECT 1 FROM auth.users WHERE ((users.id = (select auth.uid())) AND (users.email = (project_invitations.invitee_email)::text))))));

ALTER POLICY "user_canvases_delete_policy" ON public.user_canvases
    USING (((select auth.uid()) = user_id));

ALTER POLICY "user_canvases_insert_policy" ON public.user_canvases
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "user_canvases_select_policy" ON public.user_canvases
    USING (((select auth.uid()) = user_id));

ALTER POLICY "user_canvases_update_policy" ON public.user_canvases
    USING (((select auth.uid()) = user_id))
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "user_projects_delete_policy" ON public.user_projects
    USING ((((select auth.uid()) = user_id) OR user_has_project_access(project_id, ARRAY['owner'::text])));

ALTER POLICY "user_projects_select_policy" ON public.user_projects
    USING ((((select auth.uid()) = user_id) OR user_has_project_access(project_id, ARRAY['owner'::text, 'admin'::text])));

ALTER POLICY "user_settings_delete_policy" ON public.user_settings
    USING (((select auth.uid()) = user_id));

ALTER POLICY "user_settings_insert_policy" ON public.user_settings
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "user_settings_select_policy" ON public.user_settings
    USING (((select auth.uid()) = user_id));

ALTER POLICY "user_settings_update_policy" ON public.user_settings
    USING (((select auth.uid()) = user_id))
    WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "users_delete_policy" ON public.users
    USING (((select auth.uid()) = id));

ALTER POLICY "users_insert_policy" ON public.users
    WITH CHECK (((select auth.uid()) = id));

ALTER POLICY "users_select_policy" ON public.users
    USING (((select auth.uid()) = id));

ALTER POLICY "users_update_policy" ON public.users
    USING (((select auth.uid()) = id))
    WITH CHECK (((select auth.uid()) = id));
