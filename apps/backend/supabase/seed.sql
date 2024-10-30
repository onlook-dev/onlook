INSERT INTO auth.users(instance_id, id, aud, "role", email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'hitasp@outlook.com', app.generate_token(), now(), '{"provider": "email", "providers": ["email"], "account_name": "hitasp"}', '{"display_name": "Hitasp", "bio": "A Test Account"}', FALSE);

INSERT INTO public.account_registry(account_name, is_organization)
-- Reserved account_names
    VALUES ('owner', FALSE),
('administrator', FALSE),
('superuser', FALSE),
('superadmin', FALSE),
('root', FALSE),
('user', FALSE),
('guest', FALSE),
('anon', FALSE),
('authenticated', FALSE),
('sysadmin', FALSE),
('support', FALSE),
('manager', FALSE),
('default', FALSE),
('staff', FALSE),
('help', FALSE),
('helpdesk', FALSE),
('test', FALSE),
('password', FALSE),
('demo', FALSE),
('service', FALSE),
('info', FALSE),
('webmaster', FALSE),
('security', FALSE),
('installer', FALSE);

BEGIN;
INSERT INTO public.organizations(account_name, display_name, bio)
  VALUES ('onlook', 'Onlook', 'Build in a weekend, scale to millions');
END;