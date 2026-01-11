import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  coins_reward: number;
  rarity: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export const useAllBadges = () => {
  return useQuery({
    queryKey: ['all-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('rarity', { ascending: true });

      if (error) throw error;
      return data as Badge[];
    }
  });
};

export const useUserBadges = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data as (UserBadge & { badge: Badge })[];
    },
    enabled: !!user?.id
  });
};

export const useCheckAndAwardBadges = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stats: {
      practiceCount: number;
      totalCoins: number;
      currentStreak: number;
      perfectScores: number;
      highScores: number;
      vocabMastered: number;
      leaderboardRank?: number;
      practiceHour?: number;
      dailyPractices?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get all badges
      const { data: allBadges, error: badgesError } = await supabase
        .from('badges')
        .select('*');

      if (badgesError) throw badgesError;

      // Get user's existing badges
      const { data: existingBadges, error: existingError } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

      if (existingError) throw existingError;

      const existingBadgeIds = new Set(existingBadges?.map(b => b.badge_id));
      const newBadges: Badge[] = [];

      for (const badge of allBadges || []) {
        if (existingBadgeIds.has(badge.id)) continue;

        let earned = false;

        switch (badge.requirement_type) {
          case 'practice_count':
            earned = stats.practiceCount >= badge.requirement_value;
            break;
          case 'total_coins':
            earned = stats.totalCoins >= badge.requirement_value;
            break;
          case 'streak_days':
            earned = stats.currentStreak >= badge.requirement_value;
            break;
          case 'perfect_score':
            earned = stats.perfectScores >= badge.requirement_value;
            break;
          case 'high_scores':
            earned = stats.highScores >= badge.requirement_value;
            break;
          case 'vocab_mastered':
            earned = stats.vocabMastered >= badge.requirement_value;
            break;
          case 'leaderboard_rank':
            earned = (stats.leaderboardRank || 999) <= badge.requirement_value;
            break;
          case 'early_practice':
            earned = stats.practiceHour !== undefined && stats.practiceHour < 8;
            break;
          case 'late_practice':
            earned = stats.practiceHour !== undefined && stats.practiceHour >= 22;
            break;
          case 'daily_practices':
            earned = (stats.dailyPractices || 0) >= badge.requirement_value;
            break;
        }

        if (earned) {
          const { error: insertError } = await supabase
            .from('user_badges')
            .insert({
              user_id: user.id,
              badge_id: badge.id
            });

          if (!insertError) {
            newBadges.push(badge);

            // Award coins if badge has coin reward
            if (badge.coins_reward > 0) {
              // Update wallet
              const { data: wallet } = await supabase
                .from('user_wallets')
                .select('balance, total_earned')
                .eq('user_id', user.id)
                .single();

              if (wallet) {
                await supabase
                  .from('user_wallets')
                  .update({
                    balance: wallet.balance + badge.coins_reward,
                    total_earned: wallet.total_earned + badge.coins_reward
                  })
                  .eq('user_id', user.id);

                await supabase
                  .from('coin_transactions')
                  .insert({
                    user_id: user.id,
                    amount: badge.coins_reward,
                    transaction_type: 'badge_reward',
                    description: `Earned badge: ${badge.name}`
                  });
              }
            }
          }
        }
      }

      return newBadges;
    },
    onSuccess: (newBadges) => {
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['coin-transactions'] });

      newBadges.forEach(badge => {
        const rarityEmoji = {
          common: '🥉',
          uncommon: '🥈',
          rare: '🥇',
          epic: '💎'
        }[badge.rarity] || '🏆';

        toast.success(`${rarityEmoji} Badge Unlocked: ${badge.name}!`, {
          description: badge.coins_reward > 0 
            ? `+${badge.coins_reward} coins reward!` 
            : badge.description || undefined
        });
      });
    }
  });
};

export const getBadgeIcon = (iconName: string) => {
  // Map badge icon names to lucide icon components
  const iconMap: Record<string, string> = {
    'footprints': 'Footprints',
    'book-open': 'BookOpen',
    'graduation-cap': 'GraduationCap',
    'medal': 'Medal',
    'star': 'Star',
    'target': 'Target',
    'flame': 'Flame',
    'fire': 'Flame',
    'book': 'Book',
    'coins': 'Coins',
    'gem': 'Gem',
    'sunrise': 'Sunrise',
    'moon': 'Moon',
    'zap': 'Zap',
    'trophy': 'Trophy'
  };
  return iconMap[iconName] || 'Trophy';
};

export const getRarityColor = (rarity: string) => {
  const colors: Record<string, string> = {
    common: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30',
    uncommon: 'text-green-400 bg-green-400/10 border-green-400/30',
    rare: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    epic: 'text-purple-400 bg-purple-400/10 border-purple-400/30'
  };
  return colors[rarity] || colors.common;
};
