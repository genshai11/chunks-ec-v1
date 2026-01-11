import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  BookOpen, 
  Target, 
  Flame, 
  TrendingUp, 
  Clock,
  Mic,
  Loader2,
  History,
  ArrowRight
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CourseCard } from "@/components/dashboard/CourseCard";
import { LessonItem } from "@/components/dashboard/LessonItem";
import { CategoryTabs } from "@/components/dashboard/CategoryTabs";
import { PracticeItemCard } from "@/components/dashboard/PracticeItemCard";
import { PracticeModal } from "@/components/practice/PracticeModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useUserData";
import { useCourses, useEnrollments, useCourseLessons, useEnrollInCourse, Lesson } from "@/hooks/useCourses";
import { useUserStats, useUserProgress } from "@/hooks/usePractice";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { formatDistanceToNow } from "date-fns";

const Index = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();
  const { data: userStats } = useUserStats();
  const enrollInCourse = useEnrollInCourse();
  const tts = useTextToSpeech();
  
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeCategory, setActiveCategory] = useState("Vocab");
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);

  // Get user progress for selected lesson
  const { data: lessonProgress } = useUserProgress(selectedLesson?.id);

  // Get enrolled course IDs
  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
  
  // Find first enrolled course for lessons display
  const firstEnrolledCourse = courses?.find(c => enrolledCourseIds.includes(c.id));
  
  // Fetch lessons for the selected/first enrolled course
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(
    selectedCourseId || firstEnrolledCourse?.id || null
  );

  // Get categories from selected lesson
  const lessonCategories = selectedLesson?.categories 
    ? Object.entries(selectedLesson.categories).map(([name, items]) => ({
        id: name.toLowerCase(),
        name,
        count: (items as any[]).length
      }))
    : [];

  // Get practice items for active category with mastery status
  const practiceItems = selectedLesson?.categories?.[activeCategory] || [];
  const practiceItemsWithMastery = practiceItems.map((item: any, index: number) => {
    const progress = lessonProgress?.find(
      p => p.category === activeCategory && p.item_index === index
    );
    return {
      ...item,
      mastered: (progress?.mastery_level || 0) >= 3,
      bestScore: progress?.best_score || 0,
      attempts: progress?.attempts || 0
    };
  });

  const isLoading = coursesLoading || enrollmentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
              Welcome back, {profile?.display_name || 'Learner'}! 👋
            </h1>
            <p className="text-muted-foreground">
              Continue your English learning journey. You're doing great!
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Current Streak"
              value={`${userStats?.streak || 0} days`}
              icon={Flame}
              variant="primary"
            />
            <StatsCard
              title="Enrolled Courses"
              value={enrolledCourseIds.length.toString()}
              subtitle={`out of ${courses?.length || 0}`}
              icon={BookOpen}
              variant="default"
            />
            <StatsCard
              title="Average Score"
              value={userStats?.avgScore ? `${userStats.avgScore}%` : "--"}
              subtitle={userStats?.totalPractice ? `${userStats.totalPractice} practices` : undefined}
              icon={Target}
              variant="success"
            />
            <StatsCard
              title="Practice Time"
              value={`${userStats?.practiceHours || 0}h`}
              subtitle="this week"
              icon={Clock}
              variant="accent"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Courses & Lessons */}
            <div className="lg:col-span-2 space-y-6">
              {/* Available Courses */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-semibold text-foreground">
                    {enrolledCourseIds.length > 0 ? 'Your Courses' : 'Available Courses'}
                  </h2>
                </div>
                
                {courses?.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-border/50 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No courses available yet. Check back soon!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses?.map((course) => {
                      const isEnrolled = enrolledCourseIds.includes(course.id);
                      return (
                        <CourseCard
                          key={course.id}
                          code={course.code}
                          name={course.name}
                          description={course.description || ''}
                          lessonsCount={15}
                          studentsCount={0}
                          enrolled={isEnrolled}
                          onEnroll={() => enrollInCourse.mutate(course.id)}
                          onContinue={() => setSelectedCourseId(course.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </motion.section>

              {/* Lessons */}
              {(selectedCourseId || firstEnrolledCourse) && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-display font-semibold text-foreground">
                      {courses?.find(c => c.id === (selectedCourseId || firstEnrolledCourse?.id))?.code} Lessons
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {lessons?.length || 0} lessons
                    </span>
                  </div>
                  
                  {lessonsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : lessons?.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-border/50 text-center">
                      <p className="text-muted-foreground">
                        No lessons in this course yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lessons?.map((lesson) => (
                        <LessonItem
                          key={lesson.id}
                          index={lesson.order_index}
                          name={lesson.lesson_name}
                          categories={Object.entries(lesson.categories || {}).map(([name, items]) => ({
                            name,
                            count: (items as any[]).length
                          }))}
                          deadline={lesson.deadline_date ? new Date(lesson.deadline_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                          status="available"
                          onClick={() => {
                            setSelectedLesson(lesson);
                            const cats = Object.keys(lesson.categories || {});
                            if (cats.length > 0) setActiveCategory(cats[0]);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.section>
              )}
            </div>

            {/* Practice Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              {/* Quick Practice */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <h3 className="font-display font-semibold text-lg mb-4">
                  {selectedLesson ? selectedLesson.lesson_name : 'Quick Practice'}
                </h3>
                
                {selectedLesson ? (
                  <>
                    <CategoryTabs
                      categories={lessonCategories}
                      activeCategory={activeCategory.toLowerCase()}
                      onSelect={(cat) => {
                        const originalCat = Object.keys(selectedLesson.categories || {}).find(
                          k => k.toLowerCase() === cat
                        );
                        if (originalCat) setActiveCategory(originalCat);
                      }}
                    />
                    <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                      {practiceItemsWithMastery.slice(0, 5).map((item: any, i: number) => (
                        <PracticeItemCard
                          key={i}
                          english={item.English}
                          vietnamese={item.Vietnamese}
                          mastered={item.mastered}
                          onClick={() => setIsPracticeOpen(true)}
                          onListen={() => tts.speak(item.English)}
                        />
                      ))}
                    </div>
                    <Button 
                      className="w-full mt-4 gradient-primary text-primary-foreground"
                      onClick={() => setIsPracticeOpen(true)}
                    >
                      <Mic size={18} className="mr-2" />
                      Start Practice Session
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Mic className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Select a lesson to start practicing
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="p-6 rounded-2xl bg-card border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-display font-semibold text-lg">
                    Recent Activity
                  </h3>
                </div>
                {userStats?.recentHistory && userStats.recentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {userStats.recentHistory.slice(0, 5).map((history: any, i: number) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                      >
                        <div>
                          <div className={`text-sm font-medium ${
                            history.score >= 70 ? "text-success" : "text-muted-foreground"
                          }`}>
                            Score: {history.score}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(history.practiced_at), { addSuffix: true })}
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${
                          history.coins_earned >= 0 ? "text-success" : "text-destructive"
                        }`}>
                          {history.coins_earned >= 0 ? "+" : ""}{history.coins_earned} C
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      No activity yet. Start practicing to see your progress!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Practice Modal */}
      {selectedLesson && (
        <PracticeModal
          isOpen={isPracticeOpen}
          onClose={() => setIsPracticeOpen(false)}
          lessonId={selectedLesson.id}
          lessonName={selectedLesson.lesson_name}
          category={activeCategory}
          items={practiceItemsWithMastery.map((item: any) => ({
            english: item.English,
            vietnamese: item.Vietnamese,
            mastered: item.mastered
          }))}
        />
      )}
    </div>
  );
};

export default Index;
