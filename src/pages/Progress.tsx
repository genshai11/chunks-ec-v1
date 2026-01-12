import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, 
  TrendingUp, 
  Clock,
  Trophy,
  History,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Star,
  Layers
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useUserStats } from "@/hooks/usePractice";
import { useStreak } from "@/hooks/useStreak";
import { useProgressStats, CourseProgress, LessonProgress } from "@/hooks/useProgressStats";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const Progress = () => {
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: streakData } = useStreak();
  const { data: progressStats, isLoading: progressLoading } = useProgressStats();
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const isLoading = statsLoading || progressLoading;

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-muted-foreground";
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-success";
    if (percent >= 50) return "bg-warning";
    return "bg-primary";
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-1">
              Your Progress
            </h1>
            <p className="text-muted-foreground text-sm">
              Track mastery across courses, lessons & categories
            </p>
          </motion.div>

          {/* Streak Card - Compact Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <StreakDisplay streak={streakData} />
          </motion.div>

          {/* Overview Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          >
            <Card className="border-primary/20">
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold text-primary">
                  {progressStats?.overallCompletion || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Overall Complete</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold">{progressStats?.totalMastered || 0}</div>
                <div className="text-xs text-muted-foreground">Items Mastered</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold">{userStats?.avgScore || 0}%</div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold">{userStats?.totalPractice || 0}</div>
                <div className="text-xs text-muted-foreground">Practices</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Mastery Overview */}
          {progressStats?.categoryMastery && progressStats.categoryMastery.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="w-5 h-5 text-primary" />
                    Category Mastery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {progressStats.categoryMastery.map((cat, i) => (
                      <motion.div
                        key={cat.category}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 * i }}
                        className="p-3 rounded-xl bg-secondary/30 border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm truncate">{cat.category}</span>
                          <Badge variant={cat.masteryPercent >= 50 ? "default" : "secondary"} className="text-xs">
                            {cat.masteryPercent}%
                          </Badge>
                        </div>
                        <ProgressBar 
                          value={cat.masteryPercent} 
                          className="h-2 mb-2" 
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{cat.masteredItems}/{cat.totalItems} mastered</span>
                          <span className={getScoreColor(cat.avgScore)}>
                            {cat.avgScore > 0 ? `${cat.avgScore}% avg` : '—'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Course Progress Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Course Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progressStats?.courses && progressStats.courses.length > 0 ? (
                  <div className="space-y-3">
                    {progressStats.courses.map((course: CourseProgress) => (
                      <div key={course.courseId} className="border border-border/50 rounded-xl overflow-hidden">
                        {/* Course Header */}
                        <button
                          onClick={() => toggleCourse(course.courseId)}
                          className="w-full p-4 flex items-center justify-between bg-secondary/20 hover:bg-secondary/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {expandedCourses.has(course.courseId) ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <div className="font-semibold">{course.courseName}</div>
                              <div className="text-xs text-muted-foreground">
                                {course.lessons.length} lessons • {course.practicedItems}/{course.totalItems} items
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={cn("text-lg font-bold", getScoreColor(course.avgScore))}>
                                {course.avgScore > 0 ? `${course.avgScore}%` : '—'}
                              </div>
                              <div className="text-xs text-muted-foreground">avg score</div>
                            </div>
                            <div className="w-16">
                              <div className="text-sm font-bold text-center mb-1">
                                {course.completionPercent}%
                              </div>
                              <ProgressBar value={course.completionPercent} className="h-2" />
                            </div>
                          </div>
                        </button>

                        {/* Lessons */}
                        <AnimatePresence>
                          {expandedCourses.has(course.courseId) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border/30">
                                {course.lessons.map((lesson: LessonProgress) => (
                                  <div key={lesson.lessonId} className="border-b border-border/20 last:border-0">
                                    {/* Lesson Header */}
                                    <button
                                      onClick={() => toggleLesson(lesson.lessonId)}
                                      className="w-full px-4 py-3 pl-10 flex items-center justify-between hover:bg-secondary/20 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        {expandedLessons.has(lesson.lessonId) ? (
                                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        <span className="text-sm font-medium">{lesson.lessonName}</span>
                                        {lesson.completionPercent === 100 && (
                                          <CheckCircle2 className="w-4 h-4 text-success" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className={cn("text-sm font-medium", getScoreColor(lesson.avgScore))}>
                                          {lesson.avgScore > 0 ? `${lesson.avgScore}%` : '—'}
                                        </span>
                                        <div className="w-12">
                                          <ProgressBar value={lesson.completionPercent} className="h-1.5" />
                                        </div>
                                        <span className="text-xs text-muted-foreground w-12 text-right">
                                          {lesson.completionPercent}%
                                        </span>
                                      </div>
                                    </button>

                                    {/* Categories */}
                                    <AnimatePresence>
                                      {expandedLessons.has(lesson.lessonId) && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden bg-secondary/10"
                                        >
                                          <div className="px-4 py-2 pl-16 space-y-2">
                                            {lesson.categories.map((cat) => (
                                              <div 
                                                key={cat.category}
                                                className="flex items-center justify-between py-1.5"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline" className="text-xs">
                                                    {cat.category}
                                                  </Badge>
                                                  <span className="text-xs text-muted-foreground">
                                                    {cat.practicedItems}/{cat.totalItems}
                                                  </span>
                                                  {cat.masteredItems > 0 && (
                                                    <span className="text-xs text-success flex items-center gap-0.5">
                                                      <Star className="w-3 h-3" />
                                                      {cat.masteredItems}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <span className={cn("text-xs font-medium", getScoreColor(cat.avgScore))}>
                                                    {cat.avgScore > 0 ? `${cat.avgScore}%` : '—'}
                                                  </span>
                                                  <div className="w-16">
                                                    <ProgressBar value={cat.completionPercent} className="h-1" />
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No courses enrolled yet.</p>
                    <p className="text-sm">Enroll in a course to track your progress!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity & Achievements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="w-5 h-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userStats?.recentHistory && userStats.recentHistory.length > 0 ? (
                    <div className="space-y-2">
                      {userStats.recentHistory.slice(0, 5).map((history: any, i: number) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                        >
                          <div>
                            <div className="text-sm font-medium">{history.category}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(history.practiced_at), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn("text-sm font-bold", getScoreColor(history.score))}>
                              {history.score}%
                            </div>
                            <div className={cn(
                              "text-xs",
                              history.coins_earned >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {history.coins_earned >= 0 ? "+" : ""}{history.coins_earned} 🪙
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No activity yet. Start practicing!
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="w-5 h-5 text-primary" />
                    Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        id: "streak-3",
                        icon: "🔥",
                        name: "3-Day Streak",
                        current: streakData?.current_streak || 0,
                        target: 3,
                        unlocked: (streakData?.current_streak || 0) >= 3
                      },
                      {
                        id: "practice-10",
                        icon: "🎯",
                        name: "10 Practices",
                        current: userStats?.totalPractice || 0,
                        target: 10,
                        unlocked: (userStats?.totalPractice || 0) >= 10
                      },
                      {
                        id: "mastery-5",
                        icon: "⭐",
                        name: "5 Items Mastered",
                        current: progressStats?.totalMastered || 0,
                        target: 5,
                        unlocked: (progressStats?.totalMastered || 0) >= 5
                      },
                      {
                        id: "score-80",
                        icon: "📈",
                        name: "80% Avg Score",
                        current: userStats?.avgScore || 0,
                        target: 80,
                        unlocked: (userStats?.avgScore || 0) >= 80
                      }
                    ].map((milestone) => (
                      <div 
                        key={milestone.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          milestone.unlocked 
                            ? "bg-primary/10 border-primary/30" 
                            : "bg-secondary/20 border-border/30"
                        )}
                      >
                        <span className="text-2xl">{milestone.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "font-medium text-sm",
                              !milestone.unlocked && "text-muted-foreground"
                            )}>
                              {milestone.name}
                            </span>
                            {milestone.unlocked ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {milestone.current}/{milestone.target}
                              </span>
                            )}
                          </div>
                          {!milestone.unlocked && (
                            <ProgressBar 
                              value={Math.min(100, (milestone.current / milestone.target) * 100)} 
                              className="h-1.5" 
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Progress;
