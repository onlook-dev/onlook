-------------------------------------------------------
-- Section - app schema and Extensions setup
-------------------------------------------------------
-- revoke execution by default from public
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

CREATE SCHEMA IF NOT EXISTS app;

GRANT USAGE ON SCHEMA app TO service_role, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON tables TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT
SELECT
    ON tables TO authenticated;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS unaccent;

-------------------------------------------------------
-- Section - Domains
-------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT
            1
        FROM
            pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE
            t.typname = 'valid_name'
            AND n.nspname = 'app') THEN
    CREATE DOMAIN app.valid_name AS citext CHECK(VALUE ~ '^[A-Za-z][A-Za-z0-9_-]{0,30}[A-Za-z0-9]$');
END IF;
END;
$$;

DO $$
BEGIN
    -- check it email_address already exists on app schema
    IF NOT EXISTS(
        SELECT
            1
        FROM
            pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE
            t.typname = 'email_address'
            AND n.nspname = 'app') THEN
    CREATE DOMAIN app.email_address AS citext CHECK(VALUE ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$');
END IF;
END;
$$;

-------------------------------------------------------
-- Section - Types
-------------------------------------------------------
DO $$
BEGIN
    -- check it membership_role already exists on app schema
    IF NOT EXISTS(
        SELECT
            1
        FROM
            pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE
            t.typname = 'membership_role'
            AND n.nspname = 'app') THEN
    CREATE TYPE app.membership_role AS ENUM(
        'owner',
        'write',
        'read'
);
END IF;
END;
$$;

-------------------------------------------------------
-- Section - Storage
-------------------------------------------------------
DO $$
BEGIN
    -- check if avatars already exists on buckets
    IF NOT EXISTS(
        SELECT
            1
        FROM
            storage.buckets b
        WHERE
            b.id = 'avatars') THEN
    INSERT INTO storage.buckets(id, name, allowed_mime_types, public, avif_autodetection, file_size_limit)
        VALUES('avatars', 'avatars', ARRAY['image/*'], TRUE, TRUE, 2097152);
END IF;
END;
$$;

-------------------------------------------------------
-- Section - Security
-------------------------------------------------------
CREATE POLICY storage_objects_select_policy ON storage.objects AS permissive
    FOR SELECT TO public -- all roles
        USING (bucket_id = 'avatars');

-------------------------------------------------------
-- Section - app trigger functions
-------------------------------------------------------
CREATE OR REPLACE FUNCTION app.trigger_set_timestamps()
    RETURNS TRIGGER
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = now();
        NEW.updated_at = now();
    ELSE
        NEW.updated_at = now();
        NEW.created_at = OLD.created_at;
    END IF;
    RETURN NEW;
END
$$
LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION app.trigger_set_update_tracking()
    RETURNS TRIGGER
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = auth.uid();
        NEW.updated_by = auth.uid();
    ELSE
        NEW.updated_by = auth.uid();
        NEW.created_by = OLD.created_by;
    END IF;
    RETURN NEW;
END
$$
LANGUAGE PLPGSQL;

-------------------------------------------------------
-- Section - app utility functions
-------------------------------------------------------
CREATE OR REPLACE FUNCTION app.generate_name(account_name citext, partial_name citext)
    RETURNS text IMMUTABLE
    LANGUAGE sql
    AS $$
    SELECT format('%s-%s', $1, $2)
$$;

GRANT EXECUTE ON FUNCTION app.generate_name(citext, citext) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app.simulate_login(email citext)
    RETURNS void
    LANGUAGE sql
    AS $$
    /*
     Simulated JWT of logged in user
     */
    SELECT
        set_config('request.jwt.claims',(
                SELECT
                    json_build_object('sub', id, 'role', 'authenticated')::text FROM auth.users
                WHERE
                    email = simulate_login.email), TRUE), set_config('role', 'authenticated', TRUE)
$$;

GRANT EXECUTE ON FUNCTION app.simulate_login(citext) TO service_role;

CREATE OR REPLACE FUNCTION app.generate_token(length int DEFAULT 21)
    RETURNS text
    LANGUAGE "sql"
    AS $$
    SELECT
        regexp_replace(replace(replace(replace(replace(encode(gen_random_bytes(length)::bytea, 'base64'), '/', ''), '+', ''), '\', ''), ' = ', ''), E'[\n\r]+', '', 'g');
$$;

GRANT EXECUTE ON FUNCTION app.generate_token(int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app.generate_id(length int)
    RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    characters text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    bytes bytea := gen_random_bytes(length);
    l int := length(characters);
    i int := 0;
    output text := '';
BEGIN
    WHILE i < length LOOP
        output := output || substr(characters, get_byte(bytes, i) % l + 1, 1);
        i := i + 1;
    END LOOP;
    RETURN lower(output);
END;
$$;

GRANT EXECUTE ON FUNCTION app.generate_id(int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app.nanoid(length int DEFAULT 21, alphabet text DEFAULT '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' ::text, additionalbytesfactor double precision DEFAULT 1.6)
    RETURNS text
    LANGUAGE plpgsql
    PARALLEL SAFE
    AS $$
DECLARE
    alphabetArray text[];
    alphabetLength int := 64;
    mask int := 63;
    step int := 34;
BEGIN
    IF length IS NULL OR length < 1 THEN
        RAISE EXCEPTION 'The length must be defined and greater than 0!';
    END IF;
    IF alphabet IS NULL OR length(alphabet) = 0 OR length(alphabet) > 255 THEN
        RAISE EXCEPTION 'The alphabet can''t be undefined, zero or bigger than 255 symbols!';
    END IF;
    IF additionalBytesFactor IS NULL OR additionalBytesFactor < 1 THEN
        RAISE EXCEPTION 'The additional bytes factor can''t be less than 1!';
    END IF;
    alphabetArray := regexp_split_to_array(alphabet, '');
    alphabetLength := array_length(alphabetArray, 1);
    mask :=(2 << cast(floor(log(alphabetLength - 1) / log(2)) AS int)) - 1;
    step := cast(ceil(additionalBytesFactor * mask * length / alphabetLength) AS int);
    IF step > 1024 THEN
        step := 1024;
        -- The step length % can''t be bigger then 1024!
    END IF;
    RETURN app.nanoid_optimized(length, alphabet, mask, step);
END
$$;

GRANT EXECUTE ON FUNCTION app.nanoid(int, text, double precision) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app.nanoid_optimized(length int, alphabet text, mask int, step int)
    RETURNS text
    LANGUAGE plpgsql
    PARALLEL SAFE
    AS $$
DECLARE
    idBuilder text := '';
    counter int := 0;
    bytes bytea;
    alphabetIndex int;
    alphabetArray text[];
    alphabetLength int := 64;
BEGIN
    alphabetArray := regexp_split_to_array(alphabet, '');
    alphabetLength := array_length(alphabetArray, 1);
    LOOP
        bytes := extensions.gen_random_bytes(step);
        FOR counter IN 0..step - 1 LOOP
            alphabetIndex :=(get_byte(bytes, counter) & mask) + 1;
            IF alphabetIndex <= alphabetLength THEN
                idBuilder := idBuilder || alphabetArray[alphabetIndex];
                IF length(idBuilder) = length THEN
                    RETURN idBuilder;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION app.nanoid_optimized(int, text, int, int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app.slugify(dirty_value text)
    RETURNS text
    LANGUAGE sql
    AS $$
    -- removes accents (diacritic signs) from a given string
    WITH unaccented_value AS(
        SELECT
            unaccent(dirty_value) AS dirty_value
),
-- snakecases the string
snakecase_value AS(
    SELECT
        regexp_replace(dirty_value, '([a-z])([A-Z])', '\1-\2', 'g') AS dirty_value
    FROM
        unaccented_value
),
-- lowercases the string
lowercase_value AS(
    SELECT
        lower(dirty_value) AS dirty_value
    FROM
        snakecase_value
),
-- remove single and double quotes
quotes_removed_value AS(
    SELECT
        regexp_replace(dirty_value, '[''"]+', '', 'gi') AS dirty_value
    FROM
        lowercase_value
),
hyphenated_value AS(
    SELECT
        regexp_replace(dirty_value, '[^a-z0-9\\-_]+', '-', 'gi') AS dirty_value
    FROM
        quotes_removed_value
),
-- trims hyphens('-') if they exist on the head or tail of the string
trimmed_value AS(
    SELECT
        regexp_replace(regexp_replace(dirty_value, '\-+$', ''), '^\-', '') AS dirty_value FROM hyphenated_value
)
        SELECT
            dirty_value
        FROM
            trimmed_value;
$$;

GRANT EXECUTE ON FUNCTION app.slugify(text) TO authenticated, service_role;

