-------------------------------------------------------
-- Section - Types
-------------------------------------------------------
CREATE TYPE feature_name AS ENUM (
    'ai'
);

-------------------------------------------------------
-- Section - Tables
-------------------------------------------------------
CREATE TABLE public.feature (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT NOW(),
    email text NOT NULL,
    features feature_name[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (id),
    UNIQUE (email)
);

-------------------------------------------------------
-- Section - RPC Functions
-------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_features()
RETURNS feature_name[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email text;
    user_features feature_name[];
BEGIN
    -- Get the email from the JWT token
    user_email := (SELECT email FROM auth.jwt());
    
    -- Get features only if email matches
    SELECT features INTO user_features
    FROM feature
    WHERE email = user_email;
    
    -- Return empty array if no features found
    RETURN COALESCE(user_features, '{}'::feature_name[]);
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_features TO authenticated;