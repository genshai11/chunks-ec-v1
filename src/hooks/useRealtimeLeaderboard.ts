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

  // Initial fetch
  const { data: leaderboard, isLoading, refetch } = useQuery({
    queryKey: ['realtime-leaderboard', limit],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url');

      if (profilesError) throw profilesError;

      // Get practice history aggregated by user
      const { data: practiceData, error: practiceError } = await supabase
        .from('practice_history')
        .select('user_id, score');

      if (practiceError) throw practiceError;

      // Get wallets for coin balance
      const { data: wallets, error: walletsError } = await supabase
        .from('user_wallets')
        .select('user_id, balance');

      if (walletsError) throw walletsError;

      // Aggregate practice data by user
      const userStats: Record<string, { totalScore: number; practiceCount: number }> = {};
      practiceData?.forEach(practice => {
        if (!userStats[practice.user_id]) {
          userStats[practice.user_id] = { totalScore: 0, practiceCount: 0 };
        }
        userStats[practice.user_id].totalScore += practice.score;
        userStats[practice.user_id].practiceCount += 1;
      });

      // Create wallet lookup
      const walletLookup: Record<string, number> = {};
      wallets?.forEach(wallet => {
        walletLookup[wallet.user_id] = wallet.balance;
      });

      // Build leaderboard entries
      const entries: RealtimeLeaderboardEntry[] = profiles
        .map(profile => {
          const stats = userStats[profile.id] || { totalScore: 0, practiceCount: 0 };
          const previousInfo = rankChanges.get(profile.id);
          
          return {
            userId: profile.id,
            displayName: profile.display_name || 'Anonymous',
            avatarUrl: profile.avatar_url,
            totalScore: stats.totalScore,
            practiceCount: stats.practiceCount,
            avgScore: stats.practiceCount > 0 
              ? Math.round(stats.totalScore / stats.practiceCount) 
              : 0,
            coins: walletLookup[profile.id] || 0,
            rank: 0,
            previousRank: previousInfo?.previous
          };
        })
        .filter(e => e.practiceCount > 0)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit)
        .map((entry, index) => {
          const rank = index + 1;
          let rankChange: 'up' | 'down' | 'same' | 'new' = 'same';
          
          if (entry.previousRank) {
            if (rank < entry.previousRank) rankChange = 'up';
            else if (rank > entry.previousRank) rankChange = 'down';
          } else if (entry.practiceCount === 1) {
            rankChange = 'new';
          }
          
          return { ...entry, rank, rankChange };
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
    refetchInterval: false, // We'll handle this with realtime
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
          // Refetch leaderboard when new practice is added
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
          // Refetch when wallets change
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

    const { data: practiceData } = await supabase
      .from('practice_history')
      .select('user_id, score');

    const userTotals: Record<string, number> = {};
    practiceData?.forEach(practice => {
      userTotals[practice.user_id] = (userTotals[practice.user_id] || 0) + practice.score;
    });

    const sortedUsers = Object.entries(userTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([id], index) => ({ userId: id, rank: index + 1 }));

    const userRankInfo = sortedUsers.find(u => u.userId === user.id);
    
    if (userRankInfo) {
      setPreviousRank(rank);
      setRank(userRankInfo.rank);
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
