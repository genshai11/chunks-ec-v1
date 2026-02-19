import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  start_date: string | null;
  schedule_days: string[] | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  lesson_name: string;
  lesson_file: string | null;
  categories: Record<string, Array<{ English: string; Vietnamese: string }>>;
  order_index: number;
  deadline_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  class_id: string | null;
  enrolled_at: string;
  start_date: string | null;
  status: string;
  completed_at: string | null;
  courses?: Course;
  course_classes?: {
    id: string;
    class_code: string;
    class_name: string;
    start_date: string;
    schedule_days: string[];
  };
}

export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Course[];
    }
  });
};

export const useCourseLessons = (courseId: string | null) => {
  return useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!courseId
  });
};

export const useAllLessons = () => {
  return useQuery({
    queryKey: ['all-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, courses(code, name)')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data;
    }
  });
};

export const useEnrollments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses(*),
          course_classes:class_id(id, class_code, class_name, start_date, schedule_days)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Transform schedule_days from jsonb to string array
      return (data || []).map(e => ({
        ...e,
        course_classes: e.course_classes ? {
          ...e.course_classes,
          schedule_days: Array.isArray(e.course_classes.schedule_days) 
            ? e.course_classes.schedule_days 
            : ['monday', 'wednesday', 'friday']
        } : null
      })) as Enrollment[];
    },
    enabled: !!user?.id
  });
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (course: Omit<Course, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          ...course,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create course: ${error.message}`);
    }
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (course: Partial<Course> & { id: string }) => {
      const { id, ...updates } = course;
      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update course: ${error.message}`);
    }
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete course: ${error.message}`);
    }
  });
};

export const useCreateLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lessons')
        .insert(lesson)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['all-lessons'] });
      toast.success('Lesson created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create lesson: ${error.message}`);
    }
  });
};

export const useDeleteLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['all-lessons'] });
      toast.success('Lesson deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete lesson: ${error.message}`);
    }
  });
};

export const useUpdateLessonDeadline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, deadline }: { lessonId: string; deadline: string | null }) => {
      const { error } = await supabase
        .from('lessons')
        .update({ deadline_date: deadline })
        .eq('id', lessonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['all-lessons'] });
      toast.success('Deadline updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update deadline: ${error.message}`);
    }
  });
};

// Note: useEnrollInCourse is deprecated - use useAddUserToClass from useCourseClasses.ts instead
// Enrollments are now managed through classes, not directly through courses
