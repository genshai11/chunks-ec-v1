import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface CourseClass {
  id: string;
  course_id: string;
  class_name: string;
  class_code: string;
  start_date: string;
  schedule_days: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  courses?: {
    id: string;
    code: string;
    name: string;
  };
}

export const useCourseClasses = (courseId?: string) => {
  return useQuery({
    queryKey: ['course-classes', courseId],
    queryFn: async () => {
      let query = supabase
        .from('course_classes')
        .select('*, courses(id, code, name)')
        .order('start_date', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the jsonb schedule_days to string array
      return (data || []).map(c => ({
        ...c,
        schedule_days: Array.isArray(c.schedule_days) 
          ? c.schedule_days 
          : ['monday', 'wednesday', 'friday']
      })) as CourseClass[];
    }
  });
};

export const useAllCourseClasses = () => {
  return useQuery({
    queryKey: ['all-course-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_classes')
        .select('*, courses(id, code, name)')
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(c => ({
        ...c,
        schedule_days: Array.isArray(c.schedule_days) 
          ? c.schedule_days 
          : ['monday', 'wednesday', 'friday']
      })) as CourseClass[];
    }
  });
};

export const useCreateCourseClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseClass: Omit<CourseClass, 'id' | 'created_at' | 'updated_at' | 'courses'>) => {
      const { data, error } = await supabase
        .from('course_classes')
        .insert({
          course_id: courseClass.course_id,
          class_name: courseClass.class_name,
          class_code: courseClass.class_code,
          start_date: courseClass.start_date,
          schedule_days: courseClass.schedule_days,
          is_active: courseClass.is_active
        })
        .select('*, courses(id, code, name)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-classes'] });
      queryClient.invalidateQueries({ queryKey: ['all-course-classes'] });
      toast.success('Class created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create class: ${error.message}`);
    }
  });
};

export const useUpdateCourseClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseClass: Partial<CourseClass> & { id: string }) => {
      const { id, courses, ...updates } = courseClass;
      const { error } = await supabase
        .from('course_classes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-classes'] });
      queryClient.invalidateQueries({ queryKey: ['all-course-classes'] });
      toast.success('Class updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update class: ${error.message}`);
    }
  });
};

export const useDeleteCourseClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('course_classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-classes'] });
      queryClient.invalidateQueries({ queryKey: ['all-course-classes'] });
      toast.success('Class deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete class: ${error.message}`);
    }
  });
};

// Enroll user in a specific class
export const useEnrollInClass = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ classId, courseId }: { classId: string; courseId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get the class to get its start date
      const { data: classData, error: classError } = await supabase
        .from('course_classes')
        .select('start_date')
        .eq('id', classId)
        .single();

      if (classError) throw classError;

      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          class_id: classId,
          start_date: classData.start_date
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrolled in class successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to enroll: ${error.message}`);
    }
  });
};

// Get users enrolled in a specific class
export const useClassEnrollments = (classId?: string) => {
  return useQuery({
    queryKey: ['class-enrollments', classId],
    queryFn: async () => {
      if (!classId) return [];
      
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          profiles:user_id(id, display_name, email, avatar_url)
        `)
        .eq('class_id', classId);

      if (error) throw error;
      return data;
    },
    enabled: !!classId
  });
};
