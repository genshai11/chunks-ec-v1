import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id
  });
};

export const useWallet = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Wallet | null;
    },
    enabled: !!user?.id
  });
};

export const useAllUsers = () => {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const { data: wallets, error: walletsError } = await supabase
        .from('user_wallets')
        .select('*');

      if (walletsError) throw walletsError;

      return profiles.map(profile => ({
        ...profile,
        role: roles.find(r => r.user_id === profile.id)?.role || 'user',
        wallet: wallets.find(w => w.user_id === profile.id)
      }));
    },
    enabled: isAdmin
  });
};
