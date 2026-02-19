import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface PracticeHistory {
  id: string;
  user_id: string;
  lesson_id: string;
  category: string;
  item_index: number;
  score: number;
  coins_earned: number;
  audio_url: string | null;
  metrics: Record<string, number> | null;
  practiced_at: string;
  lessons?: {
    lesson_name: string;
    categories: Record<string, unknown[]>;
  };
}

export interface UserProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  category: string;
  item_index: number;
  attempts: number;
  best_score: number;
  mastery_level: number;
  last_practiced_at: string | null;
}

export interface SpeechAnalysisResult {
  score: number;
  metrics: {
    volume: number;
    speechRate: number;
    pauses: number;
    latency: number;
    endIntensity: number;
  };
  rawMetrics: {
    volume: number;
    speechRate: number;
    pauseCount: number;
    longestPause: number;
    latency: number;
    endIntensity: number;
  };
  transcription: string;
  feedback: string[];
}

export interface PracticeIngestMetrics {
  volume: number;
  speechRate: number;
  pauseCount: number;
  longestPause: number;
  latency: number;
  endIntensity: number;
}

export interface PracticeIngestResult {
  takeId: string;
  transcript: {
    transcript: string;
    confidence: number;
    duration: number;
    wordCount: number;
    wordsPerMinute: number;
    words: unknown[];
  };
  analyze: SpeechAnalysisResult | null;
}

// Fetch user's practice history with lesson details
export const usePracticeHistory = (lessonId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['practice-history', user?.id, lessonId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('practice_history')
        .select(`
          *,
          lessons (
            lesson_name,
            categories
          )
        `)
        .eq('user_id', user.id)
        .order('practiced_at', { ascending: false });

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as PracticeHistory[];
    },
    enabled: !!user?.id
  });
};

// Fetch user's progress for a lesson
export const useUserProgress = (lessonId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-progress', user?.id, lessonId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user?.id
  });
};

// Fetch user's overall stats
export const useUserStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get practice history for stats
      const { data: history, error: historyError } = await supabase
        .from('practice_history')
        .select('score, practiced_at, coins_earned')
        .eq('user_id', user.id)
        .order('practiced_at', { ascending: false });

      if (historyError) throw historyError;

      // Get streak data
      const { data: streakData } = await supabase
        .from('daily_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get mastered items count
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('mastery_level')
        .eq('user_id', user.id);

      // Calculate stats
      const totalPractice = history?.length || 0;
      const avgScore = totalPractice > 0
        ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / totalPractice)
        : 0;

      // Calculate practice time this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeekPractice = history?.filter(
        h => new Date(h.practiced_at) >= weekAgo
      ).length || 0;
      const practiceHours = Math.round((thisWeekPractice * 2) / 60);

      // Count mastered and high scores
      const masteredCount = progressData?.filter(p => p.mastery_level >= 3).length || 0;
      const perfectScores = history?.filter(h => h.score >= 95).length || 0;
      const highScores = history?.filter(h => h.score >= 80).length || 0;

      return {
        totalPractice,
        avgScore,
        streak: streakData?.current_streak || 0,
        longestStreak: streakData?.longest_streak || 0,
        practiceHours,
        masteredCount,
        perfectScores,
        highScores,
        recentHistory: history?.slice(0, 10) || []
      };
    },
    enabled: !!user?.id
  });
};

// Transcribe audio using Deepgram
export const useTranscribe = () => {
  return useMutation({
    mutationFn: async (params: { audioBlob?: Blob; audioBase64?: string; mimeType?: string }) => {
      if (!params.audioBlob && !params.audioBase64) {
        throw new Error("No audio provided");
      }

      // Prefer multipart (Blob/File) to avoid base64 bloat.
      if (params.audioBlob) {
        const formData = new FormData();
        formData.append("audio", params.audioBlob, "recording.webm");

        const { data, error } = await supabase.functions.invoke("deepgram-transcribe", {
          body: formData,
        });

        if (error) throw error;
        return data as {
          transcript: string;
          confidence: number;
          duration: number;
          words: unknown[];
          wordCount: number;
          wordsPerMinute: number;
        };
      }

      // Fallback: JSON base64
      const { data, error } = await supabase.functions.invoke("deepgram-transcribe", {
        body: { audio: params.audioBase64, mimeType: params.mimeType },
      });

      if (error) throw error;
      return data as {
        transcript: string;
        confidence: number;
        duration: number;
        words: unknown[];
        wordCount: number;
        wordsPerMinute: number;
      };
    },
  });
};

// Analyze speech and get score
export const useAnalyzeSpeech = () => {
  return useMutation({
    mutationFn: async (params: {
      transcription: string;
      metrics: PracticeIngestMetrics;
    }) => {
      const { data, error } = await supabase.functions.invoke('analyze-speech', {
        body: params
      });

      if (error) throw error;
      return data as SpeechAnalysisResult;
    }
  });
};

// Ingest a practice take (creates take + transcript + optional score)
export const usePracticeIngest = () => {
  return useMutation({
    mutationFn: async (params: {
      audioBlob: Blob;
      lessonId?: string;
      category?: string;
      itemIndex?: number;
      metrics?: PracticeIngestMetrics;
      scoreOnServer?: boolean;
    }) => {
      const formData = new FormData();
      formData.append('audio', params.audioBlob, 'recording.webm');
      if (params.lessonId) formData.append('lessonId', params.lessonId);
      if (params.category) formData.append('category', params.category);
      if (typeof params.itemIndex === 'number') formData.append('itemIndex', String(params.itemIndex));
      if (params.metrics) formData.append('metrics', JSON.stringify(params.metrics));
      if (typeof params.scoreOnServer === 'boolean') formData.append('scoreOnServer', String(params.scoreOnServer));

      const { data, error } = await supabase.functions.invoke('practice-ingest', {
        body: formData,
      });

      if (error) throw error;
      return data as PracticeIngestResult;
    }
  });
};

// Save practice result with automatic streak and badge updates
export const useSavePractice = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      lessonId: string;
      category: string;
      itemIndex: number;
      score: number;
      coinsEarned: number;
      metrics?: Record<string, number>;
      audioUrl?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const safeScore = Number.isFinite(params.score) ? params.score : 0;
      const safeCoinsEarned = Number.isFinite(params.coinsEarned) ? params.coinsEarned : 0;
      const safeItemIndex = Number.isFinite(params.itemIndex) ? params.itemIndex : 0;
      const safeMetrics = params.metrics
        ? Object.fromEntries(
            Object.entries(params.metrics).map(([k, v]) => [k, Number.isFinite(v) ? v : 0])
          )
        : undefined;

      const today = new Date().toISOString().split('T')[0];
      const currentHour = new Date().getHours();

      // 1. Save practice history
      const { error: historyError } = await supabase
        .from('practice_history')
        .insert({
          user_id: user.id,
          lesson_id: params.lessonId,
          category: params.category,
          item_index: safeItemIndex,
          score: safeScore,
          coins_earned: safeCoinsEarned,
          metrics: safeMetrics as unknown as Json,
          audio_url: params.audioUrl
        });

      if (historyError) throw historyError;

      // 2. Update or create user progress
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', params.lessonId)
        .eq('category', params.category)
        .eq('item_index', safeItemIndex)
        .maybeSingle();

      if (existingProgress) {
        const newBestScore = Math.max(existingProgress.best_score, safeScore);
        const newMastery = calculateMastery(existingProgress.attempts + 1, newBestScore);

        await supabase
          .from('user_progress')
          .update({
            attempts: existingProgress.attempts + 1,
            best_score: newBestScore,
            mastery_level: newMastery,
            last_practiced_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            lesson_id: params.lessonId,
            category: params.category,
            item_index: safeItemIndex,
            attempts: 1,
            best_score: safeScore,
            mastery_level: calculateMastery(1, safeScore),
            last_practiced_at: new Date().toISOString()
          });
      }

      // 3. Update wallet if coins earned
      if (safeCoinsEarned !== 0) {
        const { data: wallet } = await supabase
          .from('user_wallets')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (wallet) {
          const newBalance = wallet.balance + safeCoinsEarned;
          const newTotalEarned = safeCoinsEarned > 0 
            ? wallet.total_earned + safeCoinsEarned 
            : wallet.total_earned;
          const newTotalSpent = safeCoinsEarned < 0 
            ? wallet.total_spent + Math.abs(safeCoinsEarned) 
            : wallet.total_spent;

          await supabase
            .from('user_wallets')
            .update({
              balance: Math.max(0, newBalance),
              total_earned: newTotalEarned,
              total_spent: newTotalSpent
            })
            .eq('user_id', user.id);

          // Create transaction record
          await supabase
              .from('coin_transactions')
              .insert({
                user_id: user.id,
                amount: safeCoinsEarned,
                transaction_type: safeCoinsEarned > 0 ? 'practice_reward' : 'practice_penalty',
                description: `Practice: ${params.category} - Score ${safeScore}`,
                reference_id: params.lessonId
              });
        }
      }

      // 4. Update streak
      let streakResult = { current_streak: 0, is_new_day: false, streak_extended: false };
      const { data: existingStreak } = await supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingStreak) {
        await supabase
          .from('daily_streaks')
          .insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_practice_date: today,
            streak_start_date: today
          });
        streakResult = { current_streak: 1, is_new_day: true, streak_extended: false };
      } else if (existingStreak.last_practice_date !== today) {
        const lastDate = existingStreak.last_practice_date 
          ? new Date(existingStreak.last_practice_date) 
          : null;
        const todayDate = new Date(today);
        
        let newStreak = 1;
        let streakStart = today;
        
        if (lastDate) {
          const diffDays = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (diffDays === 1) {
            newStreak = existingStreak.current_streak + 1;
            streakStart = existingStreak.streak_start_date || today;
          }
        }

        const newLongest = Math.max(existingStreak.longest_streak, newStreak);

        await supabase
          .from('daily_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_practice_date: today,
            streak_start_date: streakStart
          })
          .eq('user_id', user.id);

        streakResult = { 
          current_streak: newStreak, 
          is_new_day: true, 
          streak_extended: newStreak > 1 
        };
      } else {
        streakResult = { 
          current_streak: existingStreak.current_streak, 
          is_new_day: false, 
          streak_extended: false 
        };
      }

      // 5. Get updated stats for badge check
      const { data: allHistory } = await supabase
        .from('practice_history')
        .select('score, practiced_at')
        .eq('user_id', user.id);

      const { data: allProgress } = await supabase
        .from('user_progress')
        .select('mastery_level')
        .eq('user_id', user.id);

      const { data: walletData } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      // Count today's practices
      const todayPractices = allHistory?.filter(h => 
        h.practiced_at.startsWith(today)
      ).length || 0;

      const stats = {
        practiceCount: allHistory?.length || 0,
        totalCoins: walletData?.balance || 0,
        currentStreak: streakResult.current_streak,
        perfectScores: allHistory?.filter(h => h.score >= 95).length || 0,
        highScores: allHistory?.filter(h => h.score >= 80).length || 0,
        vocabMastered: allProgress?.filter(p => p.mastery_level >= 3).length || 0,
        practiceHour: currentHour,
        dailyPractices: todayPractices
      };

      // 6. Check and award badges
      const { data: allBadges } = await supabase
        .from('badges')
        .select('*');

      const { data: existingBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

      const existingBadgeIds = new Set(existingBadges?.map(b => b.badge_id));
      const newBadges: Array<{ name: string; coins_reward: number; rarity: string }> = [];

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
          case 'early_practice':
            earned = stats.practiceHour < 8;
            break;
          case 'late_practice':
            earned = stats.practiceHour >= 22;
            break;
          case 'daily_practices':
            earned = stats.dailyPractices >= badge.requirement_value;
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
            newBadges.push({
              name: badge.name,
              coins_reward: badge.coins_reward,
              rarity: badge.rarity
            });

            // Award badge coins
            if (badge.coins_reward > 0) {
              const { data: currentWallet } = await supabase
                .from('user_wallets')
                .select('balance, total_earned')
                .eq('user_id', user.id)
                .single();

              if (currentWallet) {
                await supabase
                  .from('user_wallets')
                  .update({
                    balance: currentWallet.balance + badge.coins_reward,
                    total_earned: currentWallet.total_earned + badge.coins_reward
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

      return { 
        success: true, 
        streakResult, 
        newBadges,
        stats
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['practice-history'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['coin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-streak'] });
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
      queryClient.invalidateQueries({ queryKey: ['realtime-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['progress-stats'] });

      // Show streak notification
      if (result.streakResult.is_new_day && result.streakResult.streak_extended) {
        toast.success(`🔥 ${result.streakResult.current_streak} day streak!`, {
          description: 'Keep up the great work!'
        });
      }

      // Show badge notifications
      result.newBadges.forEach(badge => {
        const rarityEmoji = {
          common: '🥉',
          uncommon: '🥈',
          rare: '🥇',
          epic: '💎'
        }[badge.rarity] || '🏆';

        toast.success(`${rarityEmoji} Badge Unlocked: ${badge.name}!`, {
          description: badge.coins_reward > 0 
            ? `+${badge.coins_reward} coins reward!` 
            : undefined,
          duration: 5000
        });
      });
    },
    onError: (error) => {
      toast.error(`Failed to save practice: ${error.message}`);
    }
  });
};

// Helper to calculate mastery level (0-5)
function calculateMastery(attempts: number, bestScore: number): number {
  if (bestScore >= 90 && attempts >= 3) return 5;
  if (bestScore >= 80 && attempts >= 2) return 4;
  if (bestScore >= 70) return 3;
  if (bestScore >= 50) return 2;
  if (attempts >= 1) return 1;
  return 0;
}
