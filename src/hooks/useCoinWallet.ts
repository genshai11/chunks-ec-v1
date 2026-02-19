import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface CoinConfig {
  reward_min: number;
  reward_max: number;
  reward_score_threshold: number;
  penalty_min: number;
  penalty_max: number;
  penalty_score_threshold: number;
  deadline_bonus: number;
  deadline_penalty: number;
  lessons_required_for_withdraw: number;
  min_avg_score_for_withdraw: number;
  // Lesson completion milestones
  milestone_25_bonus: number;
  milestone_50_bonus: number;
  milestone_75_bonus: number;
  milestone_100_bonus: number;
  // Streak bonuses
  streak_bonus_threshold: number;
  streak_bonus_min_score: number;
  streak_bonus_coins: number;
  // First practice bonus
  first_practice_bonus: number;
  // Deadline rewards (dynamic based on completion %)
  deadline_early_bonus_max: number;
  deadline_early_bonus_days: number;
  deadline_on_time_bonus: number;
  deadline_penalty_max: number;
  deadline_penalty_grace_days: number;
  deadline_penalty_scale_days: number;
  min_completion_for_bonus: number;
  penalty_completion_threshold: number;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export const useCoinConfig = () => {
  return useQuery({
    queryKey: ['coin-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_config')
        .select('*');

      if (error) throw error;
      
      const config: Partial<CoinConfig> = {};
      data.forEach(item => {
        config[item.key as keyof CoinConfig] = item.value;
      });
      
      return config as CoinConfig;
    }
  });
};

export const useCoinTransactions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coin-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CoinTransaction[];
    },
    enabled: !!user?.id
  });
};

export const useUpdateCoinConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<CoinConfig>) => {
      const promises = Object.entries(updates).map(([key, value]) =>
        supabase
          .from('coin_config')
          .update({ value: value as number })
          .eq('key', key)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coin-config'] });
      toast.success('Coin configuration updated');
    },
    onError: (error) => {
      toast.error(`Failed to update config: ${error.message}`);
    }
  });
};

export const useAddCoins = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
      // Get current wallet
      const { data: wallet, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError) throw walletError;

      // Update wallet balance
      const nextBalance = Math.max(0, wallet.balance + amount);
      const { error: updateError } = await supabase
        .from('user_wallets')
        .update({
          balance: nextBalance,
          total_earned: amount > 0 ? wallet.total_earned + amount : wallet.total_earned,
          total_spent: amount < 0 ? wallet.total_spent + Math.abs(amount) : wallet.total_spent
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount,
          transaction_type: amount > 0 ? 'credit' : 'debit',
          description
        });

      if (transactionError) throw transactionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['coin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Coins updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update coins: ${error.message}`);
    }
  });
};
