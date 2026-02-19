-- Create the trigger that was missing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert missing profile/wallet/role for a specific user if that user exists.
-- This avoids breaking fresh projects where the user is not present.
INSERT INTO public.profiles (id, email, display_name)
SELECT '335ed777-07dc-418e-9e18-a60fefaaac1f', 'lucy2511kh@gmail.com', 'lucy2511kh'
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '335ed777-07dc-418e-9e18-a60fefaaac1f'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_wallets (user_id, balance)
SELECT '335ed777-07dc-418e-9e18-a60fefaaac1f', 0
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '335ed777-07dc-418e-9e18-a60fefaaac1f'
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT '335ed777-07dc-418e-9e18-a60fefaaac1f', 'user'
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = '335ed777-07dc-418e-9e18-a60fefaaac1f'
)
ON CONFLICT (user_id, role) DO NOTHING;
