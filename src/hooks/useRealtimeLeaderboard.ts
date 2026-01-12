import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface RealtimeLeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  practiceCount: number;
  avgScore: number;
  coins: number;
  rank: number;
  previousRank?: number;
  rankChange?: 'up' | 'down' | 'same' | 'new';
}

export const useRealtimeLeaderboard = (limit = 50) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rankChanges, setRankChanges] = useState<Map<string, { previous: number; current: number }>>(new Map());
  const [isLive, setIsLive] = useState(false);

  // Initial fetch using RPC for proper access
  const { data: leaderboard, isLoading, refetch } = useQuery({
    queryKey: ['realtime-leaderboard', limit],
    queryFn: async () => {
      // Use RPC function that is accessible to all authenticated users
      const { data, error } = await supabase.rpc('get_score_leaderboard', {
        p_limit: limit,
        p_offset: 0,
        p_course_id: null,
        p_class_id: null
      });

      if (error) throw error;

      // Map to our entry format with rank tracking
      const entries: RealtimeLeaderboardEntry[] = (data || []).map((row: any, index: number) => {
        const previousInfo = rankChanges.get(row.user_id);
        const rank = index + 1;
        
        let rankChange: 'up' | 'down' | 'same' | 'new' = 'same';
        if (previousInfo) {
          if (rank < previousInfo.current) rankChange = 'up';
          else if (rank > previousInfo.current) rankChange = 'down';
        } else if (row.practice_count === 1) {
          rankChange = 'new';
        }

        return {
          userId: row.user_id,
          displayName: row.display_name || 'Anonymous',
          avatarUrl: row.avatar_url,
          totalScore: row.total_score,
          practiceCount: row.practice_count,
          avgScore: row.avg_score,
          coins: row.coins,
          rank,
          previousRank: previousInfo?.current,
          rankChange
        };
      });

      // Store current ranks for next comparison
      const newRankChanges = new Map<string, { previous: number; current: number }>();
      entries.forEach(e => {
        newRankChanges.set(e.userId, { 
          previous: rankChanges.get(e.userId)?.current || e.rank, 
          current: e.rank 
        });
      });
      setRankChanges(newRankChanges);

      return entries;
    },
    refetchInterval: false,
  });

  // Get current user's rank
  const userRank = leaderboard?.find(e => e.userId === user?.id)?.rank;
  const userEntry = leaderboard?.find(e => e.userId === user?.id);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'practice_history'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['realtime-leaderboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_wallets'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['realtime-leaderboard'] });
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const forceRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    leaderboard: leaderboard || [],
    isLoading,
    isLive,
    userRank,
    userEntry,
    forceRefresh
  };
};

// Hook for just the current user's live rank
export const useRealtimeUserRank = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rank, setRank] = useState<number | null>(null);
  const [previousRank, setPreviousRank] = useState<number | null>(null);

  const calculateRank = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase.rpc('get_score_leaderboard', {
      p_limit: 1000,
      p_offset: 0,
      p_course_id: null,
      p_class_id: null
    });

    const userRankInfo = (data || []).findIndex((row: any) => row.user_id === user.id);
    
    if (userRankInfo !== -1) {
      setPreviousRank(rank);
      setRank(userRankInfo + 1);
    }
  }, [user?.id, rank]);

  useEffect(() => {
    calculateRank();

    const channel = supabase
      .channel('user-rank-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'practice_history'
        },
        () => {
          calculateRank();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calculateRank]);

  const rankChange = previousRank && rank 
    ? (rank < previousRank ? 'up' : rank > previousRank ? 'down' : 'same')
    : null;

  return { rank, previousRank, rankChange };
};
