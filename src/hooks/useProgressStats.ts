import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface CategoryProgress {
  category: string;
  totalItems: number;
  practicedItems: number;
  masteredItems: number;
  avgScore: number;
  completionPercent: number;
}

export interface LessonProgress {
  lessonId: string;
  lessonName: string;
  categories: CategoryProgress[];
  totalItems: number;
  practicedItems: number;
  masteredItems: number;
  avgScore: number;
  completionPercent: number;
}

export interface ClassProgress {
  classId: string | null;
  className: string;
  courseId: string;
  courseName: string;
  lessons: LessonProgress[];
  totalItems: number;
  practicedItems: number;
  masteredItems: number;
  avgScore: number;
  completionPercent: number;
}

// Keep CourseProgress as alias for backward compatibility
export type CourseProgress = ClassProgress;

type CourseLessonRow = {
  id: string;
  lesson_name: string;
  order_index?: number | null;
  categories?: Record<string, unknown> | null;
};

type EnrollmentRow = {
  class_id: string | null;
  course_classes?: { id: string; class_name: string; class_code?: string | null } | null;
  course?: { id: string; name: string; lessons?: CourseLessonRow[] | null } | null;
};

export const useProgressStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['progress-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch enrolled classes with course lessons
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          id,
          class_id,
          course_classes:class_id (id, class_name, class_code),
          course:courses (
            id, name,
            lessons (id, lesson_name, categories, order_index)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      // Fetch user progress
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Build progress map
      const progressMap = new Map<string, typeof progress[0][]>();
      progress?.forEach(p => {
        const key = `${p.lesson_id}-${p.category}`;
        if (!progressMap.has(key)) {
          progressMap.set(key, []);
        }
        progressMap.get(key)!.push(p);
      });

      // Calculate class progress (based on enrollments)
      const classProgressList: ClassProgress[] = [];

      (enrollments as EnrollmentRow[] | null)?.forEach((enrollment) => {
        const course = enrollment.course;
        const classInfo = enrollment.course_classes;
        if (!course) return;

        const lessonProgressList: LessonProgress[] = [];
        let classTotalItems = 0;
        let classPracticedItems = 0;
        let classMasteredItems = 0;
        let classTotalScore = 0;
        let classScoreCount = 0;

        // Sort lessons by order_index
        const sortedLessons = [...(course.lessons || [])].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        );

        sortedLessons.forEach((lesson) => {
          const categories = (lesson.categories || {}) as Record<string, unknown>;
          const categoryProgressList: CategoryProgress[] = [];
          let lessonTotalItems = 0;
          let lessonPracticedItems = 0;
          let lessonMasteredItems = 0;
          let lessonTotalScore = 0;
          let lessonScoreCount = 0;

          // Process each category in the lesson
          Object.entries(categories).forEach(([categoryName, items]) => {
            const itemCount = Array.isArray(items) ? items.length : 0;
            const key = `${lesson.id}-${categoryName}`;
            const categoryProgress = progressMap.get(key) || [];

            const practicedCount = categoryProgress.length;
            const masteredCount = categoryProgress.filter(p => p.mastery_level >= 3).length;
            const categoryAvgScore = practicedCount > 0
              ? categoryProgress.reduce((sum, p) => sum + p.best_score, 0) / practicedCount
              : 0;

            categoryProgressList.push({
              category: categoryName,
              totalItems: itemCount,
              practicedItems: practicedCount,
              masteredItems: masteredCount,
              avgScore: Math.round(categoryAvgScore),
              completionPercent: itemCount > 0 ? Math.round((practicedCount / itemCount) * 100) : 0
            });

            lessonTotalItems += itemCount;
            lessonPracticedItems += practicedCount;
            lessonMasteredItems += masteredCount;
            if (practicedCount > 0) {
              lessonTotalScore += categoryAvgScore * practicedCount;
              lessonScoreCount += practicedCount;
            }
          });

          const lessonAvgScore = lessonScoreCount > 0 ? lessonTotalScore / lessonScoreCount : 0;

          lessonProgressList.push({
            lessonId: lesson.id,
            lessonName: lesson.lesson_name,
            categories: categoryProgressList,
            totalItems: lessonTotalItems,
            practicedItems: lessonPracticedItems,
            masteredItems: lessonMasteredItems,
            avgScore: Math.round(lessonAvgScore),
            completionPercent: lessonTotalItems > 0 
              ? Math.round((lessonPracticedItems / lessonTotalItems) * 100) 
              : 0
          });

          classTotalItems += lessonTotalItems;
          classPracticedItems += lessonPracticedItems;
          classMasteredItems += lessonMasteredItems;
          if (lessonScoreCount > 0) {
            classTotalScore += lessonTotalScore;
            classScoreCount += lessonScoreCount;
          }
        });

        const classAvgScore = classScoreCount > 0 ? classTotalScore / classScoreCount : 0;

        classProgressList.push({
          classId: classInfo?.id || null,
          className: classInfo?.class_name || course.name,
          courseId: course.id,
          courseName: course.name,
          lessons: lessonProgressList,
          totalItems: classTotalItems,
          practicedItems: classPracticedItems,
          masteredItems: classMasteredItems,
          avgScore: Math.round(classAvgScore),
          completionPercent: classTotalItems > 0 
            ? Math.round((classPracticedItems / classTotalItems) * 100) 
            : 0
        });
      });

      // Calculate overall category mastery across all classes
      const categoryMasteryMap = new Map<string, { practiced: number; mastered: number; total: number; scores: number[] }>();
      
      classProgressList.forEach(cls => {
        cls.lessons.forEach(lesson => {
          lesson.categories.forEach(cat => {
            if (!categoryMasteryMap.has(cat.category)) {
              categoryMasteryMap.set(cat.category, { practiced: 0, mastered: 0, total: 0, scores: [] });
            }
            const entry = categoryMasteryMap.get(cat.category)!;
            entry.practiced += cat.practicedItems;
            entry.mastered += cat.masteredItems;
            entry.total += cat.totalItems;
            if (cat.avgScore > 0) entry.scores.push(cat.avgScore);
          });
        });
      });

      const categoryMastery = Array.from(categoryMasteryMap.entries()).map(([name, data]) => ({
        category: name,
        practicedItems: data.practiced,
        masteredItems: data.mastered,
        totalItems: data.total,
        avgScore: data.scores.length > 0 
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) 
          : 0,
        masteryPercent: data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0
      }));

      return {
        classes: classProgressList,
        // Keep 'courses' as alias for backward compatibility
        courses: classProgressList,
        categoryMastery,
        totalItems: classProgressList.reduce((sum, c) => sum + c.totalItems, 0),
        totalPracticed: classProgressList.reduce((sum, c) => sum + c.practicedItems, 0),
        totalMastered: classProgressList.reduce((sum, c) => sum + c.masteredItems, 0),
        overallCompletion: classProgressList.length > 0
          ? Math.round(classProgressList.reduce((sum, c) => sum + c.completionPercent, 0) / classProgressList.length)
          : 0
      };
    },
    enabled: !!user?.id
  });
};
