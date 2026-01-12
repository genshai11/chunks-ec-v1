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
  Layers,
  Users
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useUserStats } from "@/hooks/usePractice";
import { useStreak } from "@/hooks/useStreak";
import { useProgressStats, ClassProgress, LessonProgress } from "@/hooks/useProgressStats";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const Progress = () => {
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: streakData } = useStreak();
  const { data: progressStats, isLoading: progressLoading } = useProgressStats();
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const isLoading = statsLoading || progressLoading;

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
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
              Track mastery across classes, lessons & categories
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

          {/* Class Progress Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-primary" />
                  Class Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progressStats?.classes && progressStats.classes.length > 0 ? (
                  <div className="space-y-3">
                    {progressStats.classes.map((cls: ClassProgress) => {
                      const classKey = cls.classId || cls.courseId;
                      return (
                        <div key={classKey} className="border border-border/50 rounded-xl overflow-hidden">
                          {/* Class Header */}
                          <button
                            onClick={() => toggleClass(classKey)}
                            className="w-full p-4 flex items-center justify-between bg-secondary/20 hover:bg-secondary/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {expandedClasses.has(classKey) ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div className="text-left">
                                <div className="font-semibold">{cls.className}</div>
                                <div className="text-xs text-muted-foreground">
                                  {cls.lessons.length} lessons • {cls.practicedItems}/{cls.totalItems} items
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className={cn("text-lg font-bold", getScoreColor(cls.avgScore))}>
                                  {cls.avgScore > 0 ? `${cls.avgScore}%` : '—'}
                                </div>
                                <div className="text-xs text-muted-foreground">avg score</div>
                              </div>
                              <div className="w-16">
                                <div className="text-sm font-bold text-center mb-1">
                                  {cls.completionPercent}%
                                </div>
                                <ProgressBar value={cls.completionPercent} className="h-2" />
                              </div>
                            </div>
                          </button>

                          {/* Lessons */}
                          <AnimatePresence>
                            {expandedClasses.has(classKey) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/30">
                                  {cls.lessons.map((lesson: LessonProgress) => (
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
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No classes enrolled yet.</p>
                    <p className="text-sm">Contact your admin to get enrolled in a class!</p>
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
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-bold", getScoreColor(history.score))}>
                              {history.score}%
                            </span>
                            {history.coins_earned > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                +{history.coins_earned} 🪙
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Milestones */}
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
                  <div className="space-y-4">
                    {/* Completion Milestone */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Complete 50% of items</span>
                        <span className={cn("font-medium", (progressStats?.overallCompletion || 0) >= 50 ? "text-success" : "text-muted-foreground")}>
                          {progressStats?.overallCompletion || 0}%
                        </span>
                      </div>
                      <ProgressBar value={Math.min(100, ((progressStats?.overallCompletion || 0) / 50) * 100)} className="h-2" />
                    </div>

                    {/* Mastery Milestone */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Master 25 items</span>
                        <span className={cn("font-medium", (progressStats?.totalMastered || 0) >= 25 ? "text-success" : "text-muted-foreground")}>
                          {progressStats?.totalMastered || 0}/25
                        </span>
                      </div>
                      <ProgressBar value={Math.min(100, ((progressStats?.totalMastered || 0) / 25) * 100)} className="h-2" />
                    </div>

                    {/* Practice Milestone */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Complete 100 practices</span>
                        <span className={cn("font-medium", (userStats?.totalPractice || 0) >= 100 ? "text-success" : "text-muted-foreground")}>
                          {userStats?.totalPractice || 0}/100
                        </span>
                      </div>
                      <ProgressBar value={Math.min(100, ((userStats?.totalPractice || 0) / 100) * 100)} className="h-2" />
                    </div>

                    {/* Streak Milestone */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>7-day streak</span>
                        <span className={cn("font-medium", (streakData?.current_streak || 0) >= 7 ? "text-success" : "text-muted-foreground")}>
                          {streakData?.current_streak || 0}/7
                        </span>
                      </div>
                      <ProgressBar value={Math.min(100, ((streakData?.current_streak || 0) / 7) * 100)} className="h-2" />
                    </div>
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
