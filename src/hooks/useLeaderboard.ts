import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  practiceCount: number;
  avgScore: number;
  coins: number;
  rank: number;
}

export const useLeaderboard = (limit = 50) => {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async () => {
      // Use RPC function that is accessible to all authenticated users
      const { data, error } = await supabase.rpc('get_score_leaderboard', {
        p_limit: limit,
        p_offset: 0,
        p_course_id: null,
        p_class_id: null
      });

      if (error) throw error;

      // Map to our entry format
      const entries: LeaderboardEntry[] = (data || []).map((row: any, index: number) => ({
        userId: row.user_id,
        displayName: row.display_name || 'Anonymous',
        avatarUrl: row.avatar_url,
        totalScore: row.total_score,
        practiceCount: row.practice_count,
        avgScore: row.avg_score,
        coins: row.coins,
        rank: index + 1
      }));

      return entries;
    }
  });
};

export const useUserRank = (userId?: string) => {
  return useQuery({
    queryKey: ['user-rank', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Use RPC to get all users and find rank
      const { data, error } = await supabase.rpc('get_score_leaderboard', {
        p_limit: 1000,
        p_offset: 0,
        p_course_id: null,
        p_class_id: null
      });

      if (error) throw error;

      const userIndex = (data || []).findIndex((row: any) => row.user_id === userId);
      return userIndex >= 0 ? userIndex + 1 : null;
    },
    enabled: !!userId
  });
};
