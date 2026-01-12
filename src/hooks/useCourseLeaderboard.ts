import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

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
  return useQuery({
    queryKey: ['course-leaderboard', courseId, limit],
    queryFn: async () => {
      if (!courseId) return [];

      // Use RPC function that is accessible to all authenticated users
      const { data, error } = await supabase.rpc('get_score_leaderboard', {
        p_limit: limit,
        p_offset: 0,
        p_course_id: courseId,
        p_class_id: null
      });

      if (error) throw error;

      // Map to our entry format
      const entries: CourseLeaderboardEntry[] = (data || []).map((row: any, index: number) => ({
        userId: row.user_id,
        displayName: row.display_name || 'Anonymous',
        avatarUrl: row.avatar_url,
        totalScore: row.total_score,
        practiceCount: row.practice_count,
        avgScore: row.avg_score,
        rank: index + 1
      }));

      return entries;
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

      // Use RPC function that is accessible to all authenticated users
      const { data, error } = await supabase.rpc('get_score_leaderboard', {
        p_limit: limit,
        p_offset: 0,
        p_course_id: null,
        p_class_id: classId
      });

      if (error) throw error;

      // Map to our entry format - includes ALL enrolled users even with 0 practice
      const entries: CourseLeaderboardEntry[] = (data || []).map((row: any, index: number) => ({
        userId: row.user_id,
        displayName: row.display_name || 'Anonymous',
        avatarUrl: row.avatar_url,
        totalScore: row.total_score,
        practiceCount: row.practice_count,
        avgScore: row.avg_score,
        rank: index + 1
      }));

      return entries;
    },
    enabled: !!classId
  });
};
