import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export interface CourseLeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  practiceCount: number;
  avgScore: number;
  rank: number;
}

// Leaderboard filtered by course - shows learners in the same course
export const useCourseLeaderboard = (courseId?: string, limit: number = 50) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['course-leaderboard', courseId, limit],
    queryFn: async () => {
      if (!courseId) return [];

      // Get all users enrolled in this course
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', courseId);

      if (enrollmentError) throw enrollmentError;
      if (!enrollments || enrollments.length === 0) return [];

      const userIds = enrollments.map(e => e.user_id);

      // Get practice history for these users
      const { data: practiceData, error: practiceError } = await supabase
        .from('practice_history')
        .select('user_id, score')
        .in('user_id', userIds);

      if (practiceError) throw practiceError;

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Aggregate scores per user
      const userScores: Record<string, { total: number; count: number }> = {};
      
      for (const practice of (practiceData || [])) {
        if (!userScores[practice.user_id]) {
          userScores[practice.user_id] = { total: 0, count: 0 };
        }
        userScores[practice.user_id].total += practice.score;
        userScores[practice.user_id].count += 1;
      }

      // Build leaderboard
      const leaderboard: CourseLeaderboardEntry[] = [];

      for (const profile of (profiles || [])) {
        const scores = userScores[profile.id] || { total: 0, count: 0 };
        leaderboard.push({
          userId: profile.id,
          displayName: profile.display_name || 'Anonymous',
          avatarUrl: profile.avatar_url,
          totalScore: scores.total,
          practiceCount: scores.count,
          avgScore: scores.count > 0 ? Math.round(scores.total / scores.count) : 0,
          rank: 0
        });
      }

      // Sort by total score and assign ranks
      leaderboard.sort((a, b) => b.totalScore - a.totalScore);
      leaderboard.forEach((entry, i) => {
        entry.rank = i + 1;
      });

      return leaderboard.slice(0, limit);
    },
    enabled: !!courseId
  });
};

// Get user's enrolled class for filtering leaderboard
export const useUserEnrolledClass = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-enrolled-class', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          class_id,
          courses(id, code, name),
          course_classes:class_id(id, class_code, class_name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
    enabled: !!user?.id
  });
};

// Keep old name as alias for backward compatibility
export const useUserEnrolledCourse = useUserEnrolledClass;

// Leaderboard filtered by class - more specific than course
export const useClassLeaderboard = (classId?: string | null, limit: number = 50) => {
  return useQuery({
    queryKey: ['class-leaderboard', classId, limit],
    queryFn: async () => {
      if (!classId) return [];

      // Get all users enrolled in this class
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('class_id', classId);

      if (enrollmentError) throw enrollmentError;
      if (!enrollments || enrollments.length === 0) return [];

      const userIds = enrollments.map(e => e.user_id);

      // Get practice history for these users
      const { data: practiceData, error: practiceError } = await supabase
        .from('practice_history')
        .select('user_id, score')
        .in('user_id', userIds);

      if (practiceError) throw practiceError;

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Aggregate scores per user
      const userScores: Record<string, { total: number; count: number }> = {};
      
      for (const practice of (practiceData || [])) {
        if (!userScores[practice.user_id]) {
          userScores[practice.user_id] = { total: 0, count: 0 };
        }
        userScores[practice.user_id].total += practice.score;
        userScores[practice.user_id].count += 1;
      }

      // Build leaderboard - include ALL enrolled users even with 0 practice
      const leaderboard: CourseLeaderboardEntry[] = [];

      for (const profile of (profiles || [])) {
        const scores = userScores[profile.id] || { total: 0, count: 0 };
        leaderboard.push({
          userId: profile.id,
          displayName: profile.display_name || 'Anonymous',
          avatarUrl: profile.avatar_url,
          totalScore: scores.total,
          practiceCount: scores.count,
          avgScore: scores.count > 0 ? Math.round(scores.total / scores.count) : 0,
          rank: 0
        });
      }

      // Sort by total score and assign ranks
      leaderboard.sort((a, b) => b.totalScore - a.totalScore);
      leaderboard.forEach((entry, i) => {
        entry.rank = i + 1;
      });

      return leaderboard.slice(0, limit);
    },
    enabled: !!classId
  });
};
