BEGIN;

-- NOTE: Email confirmation toggle must be changed in Supabase Dashboard:
-- Authentication -> Providers -> Email -> turn OFF "Confirm email"

-- Grant admin role to target account when user exists
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE u.email = 'myle1996kh@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;