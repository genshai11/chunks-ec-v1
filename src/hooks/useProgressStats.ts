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

export interface CourseProgress {
  courseId: string;
  courseName: string;
  lessons: LessonProgress[];
  totalItems: number;
  practicedItems: number;
  masteredItems: number;
  avgScore: number;
  completionPercent: number;
}

export const useProgressStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['progress-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch enrolled courses with lessons
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
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

      // Calculate course progress
      const courseProgressList: CourseProgress[] = [];

      enrollments?.forEach((enrollment: any) => {
        const course = enrollment.course;
        if (!course) return;

        const lessonProgressList: LessonProgress[] = [];
        let courseTotalItems = 0;
        let coursePracticedItems = 0;
        let courseMasteredItems = 0;
        let courseTotalScore = 0;
        let courseScoreCount = 0;

        // Sort lessons by order_index
        const sortedLessons = [...(course.lessons || [])].sort(
          (a: any, b: any) => a.order_index - b.order_index
        );

        sortedLessons.forEach((lesson: any) => {
          const categories = lesson.categories || {};
          const categoryProgressList: CategoryProgress[] = [];
          let lessonTotalItems = 0;
          let lessonPracticedItems = 0;
          let lessonMasteredItems = 0;
          let lessonTotalScore = 0;
          let lessonScoreCount = 0;

          // Process each category in the lesson
          Object.entries(categories).forEach(([categoryName, items]: [string, any]) => {
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

          courseTotalItems += lessonTotalItems;
          coursePracticedItems += lessonPracticedItems;
          courseMasteredItems += lessonMasteredItems;
          if (lessonScoreCount > 0) {
            courseTotalScore += lessonTotalScore;
            courseScoreCount += lessonScoreCount;
          }
        });

        const courseAvgScore = courseScoreCount > 0 ? courseTotalScore / courseScoreCount : 0;

        courseProgressList.push({
          courseId: course.id,
          courseName: course.name,
          lessons: lessonProgressList,
          totalItems: courseTotalItems,
          practicedItems: coursePracticedItems,
          masteredItems: courseMasteredItems,
          avgScore: Math.round(courseAvgScore),
          completionPercent: courseTotalItems > 0 
            ? Math.round((coursePracticedItems / courseTotalItems) * 100) 
            : 0
        });
      });

      // Calculate overall category mastery across all courses
      const categoryMasteryMap = new Map<string, { practiced: number; mastered: number; total: number; scores: number[] }>();
      
      courseProgressList.forEach(course => {
        course.lessons.forEach(lesson => {
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
        courses: courseProgressList,
        categoryMastery,
        totalItems: courseProgressList.reduce((sum, c) => sum + c.totalItems, 0),
        totalPracticed: courseProgressList.reduce((sum, c) => sum + c.practicedItems, 0),
        totalMastered: courseProgressList.reduce((sum, c) => sum + c.masteredItems, 0),
        overallCompletion: courseProgressList.length > 0
          ? Math.round(courseProgressList.reduce((sum, c) => sum + c.completionPercent, 0) / courseProgressList.length)
          : 0
      };
    },
    enabled: !!user?.id
  });
};
