import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Flame,
  Mic,
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useUserData";
import { useEnrollments, useCourseLessons } from "@/hooks/useCourses";
import { useUserStats } from "@/hooks/usePractice";
import { useProgressStats } from "@/hooks/useProgressStats";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { useWallet } from "@/hooks/useUserData";
import { calculateLessonDeadlines, getDeadlineStatus } from "@/lib/scheduleUtils";
import { cn } from "@/lib/utils";

const Index = () => {
  const { data: profile } = useProfile();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();
  const { data: userStats } = useUserStats();
  const { data: wallet } = useWallet();
  const { data: progressStats } = useProgressStats();

  // Get first enrollment (class-based)
  const firstEnrollment = enrollments?.[0];
  const enrolledClass = firstEnrollment?.course_classes;
  const enrolledCourse = firstEnrollment?.courses;

  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(enrolledCourse?.id || null);

  // Calculate deadlines based on class schedule
  const lessonDeadlines = firstEnrollment && lessons 
    ? calculateLessonDeadlines(
        enrolledClass?.start_date || firstEnrollment.start_date || new Date().toISOString(),
        enrolledClass?.schedule_days || ['monday', 'wednesday', 'friday'],
        lessons.map(l => ({ id: l.id, lesson_name: l.lesson_name, order_index: l.order_index }))
      )
    : null;

  // Find lesson progress from progressStats
  const getLessonProgress = (lessonId: string) => {
    const classProgress = progressStats?.classes?.find(c => c.courseId === enrolledCourse?.id);
    return classProgress?.lessons.find(l => l.lessonId === lessonId);
  };

  // Find next lesson to practice (first incomplete one)
  const nextLesson = lessons?.find(lesson => {
    const progress = getLessonProgress(lesson.id);
    return !progress || progress.completionPercent < 100;
  }) || lessons?.[0];

  const isLoading = enrollmentsLoading || lessonsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasEnrollments = enrollments && enrollments.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-3xl mx-auto">
          {/* Compact Header with Stats */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                  Hey, {profile?.display_name?.split(' ')[0] || "there"} 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                  {hasEnrollments 
                    ? "Ready for today's practice?" 
                    : "Contact your admin to get enrolled"
                  }
                </p>
              </div>
              <CoinBadge amount={wallet?.balance || 0} size="lg" />
            </div>

            {/* Minimal Stats Row */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{userStats?.streak || 0} days</div>
                  <div className="text-xs text-muted-foreground">streak</div>
                </div>
              </div>
              
              {progressStats?.overallCompletion !== undefined && progressStats.overallCompletion > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{progressStats.overallCompletion}%</div>
                    <div className="text-xs text-muted-foreground">complete</div>
                  </div>
                </div>
              )}
              
              {userStats?.avgScore && userStats.avgScore > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{userStats.avgScore}%</div>
                    <div className="text-xs text-muted-foreground">avg score</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Primary CTA - Start Practice */}
          {hasEnrollments && nextLesson ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <Link to={`/practice?lesson=${nextLesson.id}`}>
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 p-6 lg:p-8 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Mic className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-primary">Continue Learning</span>
                      </div>
                      <h2 className="text-xl lg:text-2xl font-display font-bold text-foreground mb-2">
                        {nextLesson.lesson_name}
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        {Object.keys(nextLesson.categories || {}).length} categories • 
                        {Object.values(nextLesson.categories || {}).reduce((sum: number, items: any) => sum + items.length, 0)} items
                      </p>
                    </div>
                    
                    <Button size="lg" className="gradient-primary glow-primary gap-2 shrink-0">
                      Start Practice
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ) : !hasEnrollments ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="rounded-2xl bg-gradient-to-br from-muted/50 via-muted/30 to-transparent border border-border/50 p-6 lg:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Get Started</span>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-display font-bold text-foreground mb-2">
                      No Class Enrollment Yet
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Contact your admin or teacher to get enrolled in a class
                    </p>
                  </div>
                  
                  <Link to="/courses">
                    <Button size="lg" variant="secondary" className="gap-2">
                      View Classes
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : null}

          {/* Lesson List with Progress & Deadlines */}
          {hasEnrollments && lessons && lessons.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-semibold text-foreground">
                  {enrolledClass?.class_name || enrolledCourse?.name || 'Lessons'}
                </h2>
                <Link to="/courses" className="text-sm text-primary hover:underline">
                  View all →
                </Link>
              </div>

              <div className="space-y-2">
                {lessons.slice(0, 6).map((lesson, index) => {
                  const progress = getLessonProgress(lesson.id);
                  const deadline = lessonDeadlines?.find(d => d.lessonId === lesson.id);
                  const deadlineStatus = deadline ? getDeadlineStatus(deadline) : null;
                  const isComplete = progress?.completionPercent === 100;

                  return (
                    <Link key={lesson.id} to={`/practice?lesson=${lesson.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className={cn(
                          "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                          isComplete 
                            ? "bg-success/5 border-success/30 hover:border-success/50" 
                            : "bg-card/50 border-border/30 hover:bg-card hover:border-border/50"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                          isComplete 
                            ? "bg-success/20 text-success" 
                            : "bg-primary/10 text-primary"
                        )}>
                          {isComplete ? <CheckCircle2 className="w-5 h-5" /> : lesson.order_index}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {lesson.lesson_name}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {progress && progress.completionPercent > 0 && (
                              <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                                <Progress value={progress.completionPercent} className="h-1.5" />
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {progress.completionPercent}%
                                </span>
                              </div>
                            )}
                            
                            {!progress && (
                              <span className="text-xs text-muted-foreground">
                                {Object.keys(lesson.categories || {}).length} categories
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Deadline badge */}
                        {deadline && !isComplete && (
                          <Badge 
                            variant={deadlineStatus?.variant} 
                            className={cn("text-xs gap-1 shrink-0", deadlineStatus?.className)}
                          >
                            {deadline.isPast ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {deadlineStatus?.label}
                          </Badge>
                        )}

                        {progress && progress.avgScore > 0 && (
                          <span className={cn(
                            "text-sm font-medium shrink-0",
                            progress.avgScore >= 80 ? "text-success" : 
                            progress.avgScore >= 60 ? "text-warning" : "text-muted-foreground"
                          )}>
                            {progress.avgScore}%
                          </span>
                        )}
                        
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
