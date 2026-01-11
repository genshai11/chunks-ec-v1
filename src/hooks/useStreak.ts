import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface DailyStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  streak_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useStreak = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as DailyStreak | null;
    },
    enabled: !!user?.id
  });
};

export const useUpdateStreak = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Get current streak data
      const { data: existing, error: fetchError } = await supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existing) {
        // Create new streak record
        const { error } = await supabase
          .from('daily_streaks')
          .insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_practice_date: today,
            streak_start_date: today
          });
        
        if (error) throw error;
        return { current_streak: 1, is_new_day: true };
      }

      // Already practiced today
      if (existing.last_practice_date === today) {
        return { 
          current_streak: existing.current_streak, 
          is_new_day: false 
        };
      }

      const lastDate = existing.last_practice_date 
        ? new Date(existing.last_practice_date) 
        : null;
      const todayDate = new Date(today);
      
      let newStreak = 1;
      let streakStart = today;
      
      if (lastDate) {
        const diffDays = Math.floor(
          (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (diffDays === 1) {
          // Consecutive day - extend streak
          newStreak = existing.current_streak + 1;
          streakStart = existing.streak_start_date || today;
        }
        // If diffDays > 1, streak resets to 1
      }

      const newLongest = Math.max(existing.longest_streak, newStreak);

      const { error } = await supabase
        .from('daily_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_practice_date: today,
          streak_start_date: streakStart
        })
        .eq('user_id', user.id);

      if (error) throw error;

      return { 
        current_streak: newStreak, 
        is_new_day: true,
        streak_extended: newStreak > 1 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user-streak'] });
      
      if (result.is_new_day && result.streak_extended) {
        toast.success(`🔥 ${result.current_streak} day streak!`, {
          description: 'Keep up the great work!'
        });
      }
    }
  });
};

export const useStreakLeaderboard = (limit = 10) => {
  return useQuery({
    queryKey: ['streak-leaderboard', limit],
    queryFn: async () => {
      const { data: streaks, error: streaksError } = await supabase
        .from('daily_streaks')
        .select('user_id, current_streak, longest_streak')
        .order('current_streak', { ascending: false })
        .limit(limit);

      if (streaksError) throw streaksError;

      const userIds = streaks?.map(s => s.user_id) || [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return streaks?.map((streak, index) => ({
        rank: index + 1,
        userId: streak.user_id,
        displayName: profileMap.get(streak.user_id)?.display_name || 'Anonymous',
        avatarUrl: profileMap.get(streak.user_id)?.avatar_url,
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak
      })) || [];
    }
  });
};
