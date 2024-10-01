-------------------------------------------------------
-- Section - Tables
-------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    -- COLUMNS
    account_name app.valid_name NOT NULL UNIQUE,
    is_organization boolean NOT NULL GENERATED ALWAYS AS (TRUE) STORED,
    display_name text CHECK (LENGTH(display_name) <= 128),
    bio text CHECK (LENGTH(bio) <= 512),
    avatar_url text,
    -- TRACKER
    created_at timestamp with time zone DEFAULT NOW(),
    created_by uuid REFERENCES auth.users(id),
    updated_at timestamp with time zone DEFAULT NOW(),
    updated_by uuid REFERENCES auth.users(id),
    -- EXTRA PROPERTIES
    private_metadata jsonb DEFAULT '{}' ::jsonb,
    public_metadata jsonb DEFAULT '{}' ::jsonb,
    -- KEYS
    PRIMARY KEY (id),
    CONSTRAINT fk_account_registry FOREIGN KEY (account_name, is_organization) REFERENCES public.account_registry(account_name, is_organization)
);

CREATE TABLE IF NOT EXISTS public.users_on_organization(
    -- COLUMNS
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    membership_role app.membership_role NOT NULL,
    -- TRACKER
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    -- KEYS
    PRIMARY KEY (organization_id, user_id)
);

-------------------------------------------------------
-- Section - Indexs
-------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_organizations_account_registry ON public.users(account_name, is_organization);

CREATE INDEX IF NOT EXISTS idx_users_on_organization_user_id ON public.users_on_organization(user_id);

CREATE INDEX IF NOT EXISTS idx_users_on_organization_organization_id ON public.users_on_organization(organization_id);

CREATE INDEX IF NOT EXISTS idx_organizations_account_name_search ON public.organizations USING gin(account_name extensions.gin_trgm_ops);

-------------------------------------------------------
-- Section - TRIGGER Functions
-------------------------------------------------------
CREATE OR REPLACE FUNCTION app.trigger_organizations_on_organization_creating()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.account_registry(account_name, is_organization)
        VALUES(NEW.account_name, TRUE);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.trigger_organizations_on_organization_created()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.users_on_organization(organization_id, user_id, membership_role)
        VALUES(NEW.id, auth.uid(), 'owner');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.trigger_organizations_on_storage_object_created()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    SECURITY DEFINER
    AS $$
DECLARE
    v_account_name app.valid_name;
BEGIN
    SELECT
        (string_to_array(NEW.name, '/'::text))[1]::app.valid_name INTO v_account_name;
    UPDATE
        public.organizations
    SET
        avatar_url = NEW.name
    WHERE
        account_name = v_account_name;
    RETURN NEW;
END;
$$;

-------------------------------------------------------
-- Section - TRIGGERS
-------------------------------------------------------
CREATE TRIGGER app_set_users_on_organization_timestamp
    BEFORE INSERT OR UPDATE ON public.users_on_organization
    FOR EACH ROW
    EXECUTE PROCEDURE app.trigger_set_timestamps();

CREATE TRIGGER app_set_organizations_timestamp
    BEFORE INSERT OR UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE PROCEDURE app.trigger_set_timestamps();

CREATE TRIGGER app_set_organizations_update_tracking
    BEFORE INSERT OR UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE PROCEDURE app.trigger_set_update_tracking();

CREATE TRIGGER app_organizations_on_organization_creating
    BEFORE INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION app.trigger_organizations_on_organization_creating();

CREATE TRIGGER app_organizations_on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION app.trigger_organizations_on_organization_created();

CREATE TRIGGER app_organizations_on_storage_object_created
    AFTER INSERT ON STORAGE.objects
    FOR EACH ROW
    WHEN(NEW.bucket_id = 'avatars')
    EXECUTE PROCEDURE app.trigger_organizations_on_storage_object_created();

-------------------------------------------------------
-- Section - domain Functions
-------------------------------------------------------
CREATE OR REPLACE FUNCTION app.get_organization_users_with_role(organization_id uuid, passed_in_role app.membership_role DEFAULT NULL)
    RETURNS SETOF UUID
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    AS $$
    SELECT
        uo.user_id
    FROM
        public.users_on_organization uo
    WHERE
        uo.organization_id = get_organization_users_with_role.organization_id
        AND(uo.membership_role = passed_in_role
            OR uo.membership_role = 'owner'
            OR passed_in_role IS NULL);
$$;

GRANT EXECUTE ON FUNCTION app.get_organization_users_with_role(uuid, app.membership_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app.get_organization_names_with_role(user_id uuid, passed_in_role app.membership_role DEFAULT NULL)
    RETURNS SETOF citext
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    AS $$
    SELECT
        o.account_name
    FROM
        public.users_on_organization uo
        JOIN public.organizations o ON uo.organization_id = o.id
    WHERE
        uo.user_id = get_organization_names_with_role.user_id
        AND(uo.membership_role = passed_in_role
            OR uo.membership_role = 'owner'
            OR passed_in_role IS NULL);
$$;

GRANT EXECUTE ON FUNCTION app.get_organization_names_with_role(uuid, app.membership_role) TO authenticated;

CREATE OR REPLACE FUNCTION app.get_organization_ids_with_role(user_id uuid, passed_in_role app.membership_role DEFAULT NULL)
    RETURNS SETOF uuid
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    AS $$
    SELECT
        uo.organization_id
    FROM
        public.users_on_organization uo
    WHERE
        uo.user_id = get_organization_ids_with_role.user_id
        AND(membership_role = passed_in_role
            OR uo.membership_role = 'owner'
            OR passed_in_role IS NULL);
$$;

GRANT EXECUTE ON FUNCTION app.get_organization_ids_with_role(uuid, app.membership_role) TO authenticated;

-------------------------------------------------------
-- Section - Security
-------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users_on_organization ENABLE ROW LEVEL SECURITY;

GRANT INSERT (account_name, display_name, bio) ON public.organizations TO authenticated;

GRANT UPDATE (display_name, bio, public_metadata) ON public.organizations TO authenticated;

GRANT INSERT (organization_id, user_id, membership_role) ON public.users_on_organization TO authenticated, service_role;

GRANT UPDATE (membership_role) ON public.users_on_organization TO authenticated;

GRANT DELETE ON public.users_on_organization TO authenticated;

CREATE POLICY organizations_insert_policy ON public.organizations AS permissive
    FOR INSERT TO authenticated
        WITH CHECK (TRUE);

CREATE POLICY organizations_update_policy ON public.organizations AS permissive
    FOR UPDATE TO authenticated
        USING (id IN (
            SELECT
                app.get_organization_ids_with_role(auth.uid(), 'owner')));

CREATE POLICY organizations_delete_policy ON public.organizations AS permissive
    FOR DELETE TO authenticated
        USING (created_by = auth.uid()
            AND id IN (
                SELECT
                    app.get_organization_ids_with_role(auth.uid(), 'owner')));

CREATE POLICY organizations_select_policy ON public.organizations AS permissive
    FOR SELECT TO authenticated
        USING (TRUE);

CREATE POLICY users_on_organization_delete_policy ON public.users_on_organization AS permissive
    FOR DELETE TO authenticated
        USING (user_id = auth.uid()
            OR organization_id IN (
                SELECT
                    app.get_organization_ids_with_role(auth.uid(), 'owner')));

CREATE POLICY users_on_organization_update_policy ON public.users_on_organization AS permissive
    FOR UPDATE TO authenticated
        USING (organization_id IN (
            SELECT
                app.get_organization_ids_with_role(auth.uid(), 'owner')));

CREATE POLICY users_on_organization_select_policy ON public.users_on_organization AS permissive
    FOR SELECT TO authenticated
        USING (organization_id IN (
            SELECT
                app.get_organization_ids_with_role(auth.uid())));

-------------------------------------------------------
-- Section - Views
-------------------------------------------------------

-- TODO

-------------------------------------------------------
-- Section - RPC Functions
-------------------------------------------------------

-- TODO
