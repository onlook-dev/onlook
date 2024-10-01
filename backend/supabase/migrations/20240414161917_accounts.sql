-------------------------------------------------------
-- Section - Tables
-------------------------------------------------------
CREATE TABLE public.account_registry(
    -- COLUMNS
    account_name app.valid_name NOT NULL,
    is_organization boolean NOT NULL,
    -- TRACKER
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    -- KEYS
    PRIMARY KEY (account_name),
    UNIQUE (account_name, is_organization)
);

-------------------------------------------------------
-- Section - Indexs
-------------------------------------------------------
CREATE INDEX idx_account_registry_is_organization ON public.account_registry(is_organization);

-------------------------------------------------------
-- Section - TRIGGER Functions
-------------------------------------------------------
-------------------------------------------------------
-- Section - Triggers
-------------------------------------------------------
CREATE TRIGGER app_set_account_registry_timestamp
    BEFORE INSERT OR UPDATE ON public.account_registry
    FOR EACH ROW
    EXECUTE PROCEDURE app.trigger_set_timestamps();

-------------------------------------------------------
-- Section - domain Functions
-------------------------------------------------------
-------------------------------------------------------
-- Section - Security
-------------------------------------------------------
ALTER TABLE public.account_registry ENABLE ROW LEVEL SECURITY;

GRANT INSERT (account_name, is_organization) ON public.account_registry TO authenticated, service_role;

-------------------------------------------------------
-- Section - Views
-------------------------------------------------------
-------------------------------------------------------
-- Section - RPC Functions
-------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_accounts_state()
    RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_count bigint;
    org_count bigint;
    user_count bigint;
BEGIN
    SELECT
        COUNT(*) INTO total_count
    FROM
        public.account_registry;
    SELECT
        COUNT(*) INTO org_count
    FROM
        public.account_registry
    WHERE
        is_organization = TRUE;
    SELECT
        COUNT(*) INTO user_count
    FROM
        public.account_registry
    WHERE
        is_organization = FALSE;
    RETURN jsonb_build_object('total_count', total_count, 'organization_count', org_count, 'user_count', user_count);
END;
$$;

