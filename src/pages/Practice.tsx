import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Mic, 
  Volume2, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Play,
  Square,
  LayoutGrid,
  Calendar,
  CalendarDays,
  Coins
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { AudioWaveform } from "@/components/ui/AudioWaveform";
import { ScoreDisplay } from "@/components/practice/ScoreDisplay";
import { LessonGridView } from "@/components/practice/LessonGridView";
import { LessonCalendarView } from "@/components/practice/LessonCalendarView";
import { LessonWeekView } from "@/components/practice/LessonWeekView";
import { useEnrollments, useCourseLessons, Lesson } from "@/hooks/useCourses";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSavePractice, useUserProgress } from "@/hooks/usePractice";
import { analyzeAudioAsync, AnalysisResult } from "@/lib/audioAnalysis";
import { useCoinConfig } from "@/hooks/useCoinWallet";
import { useWallet } from "@/hooks/useUserData";
import { useProgressStats } from "@/hooks/useProgressStats";
import { calculateLessonDeadlines } from "@/lib/scheduleUtils";
import { calculateLessonProgress, getMilestoneBonus, getFirstTimePracticeBonus, calculateStreakBonus } from "@/lib/lessonProgress";
import { calculateDeadlineReward } from "@/lib/deadlineRewards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ViewMode = 'list' | 'grid' | 'calendar' | 'week';

const Practice = () => {
  const [searchParams] = useSearchParams();
  const lessonIdParam = searchParams.get("lesson");
  
  const { data: enrollments } = useEnrollments();
  const { data: wallet } = useWallet();
  const { data: coinConfig } = useCoinConfig();
  const { data: progressStats } = useProgressStats();
  
  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
  const firstCourseId = enrolledCourseIds[0];
  const firstEnrollment = enrollments?.[0];
  const enrolledClass = firstEnrollment?.course_classes;
  const enrolledCourse = firstEnrollment?.courses;
  
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(firstCourseId || null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [coinChange, setCoinChange] = useState<number | null>(null);
  const [bonusMessage, setBonusMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const recorder = useAudioRecorder();
  const tts = useTextToSpeech();
  const savePractice = useSavePractice();

  const { data: lessonProgress } = useUserProgress(selectedLesson?.id);

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

  // Calculate category statistics
  const getCategoryStats = (category: string) => {
    if (!selectedLesson || !lessonProgress) return { completed: 0, total: 0, percent: 0, coinsEarned: 0, allMastered: false };
    
    const categoryItems = selectedLesson.categories?.[category] || [];
    const total = categoryItems.length;
    let completed = 0;
    let coinsEarned = 0;
    
    categoryItems.forEach((item: any, index: number) => {
      const progress = lessonProgress.find(
        p => p.category === category && p.item_index === index
      );
      if (progress && progress.attempts > 0) {
        completed++;
        // Estimate coins from best score (simplified)
        const score = progress.best_score || 0;
        if (score >= 70) {
          coinsEarned += Math.round(5 + ((score - 70) / 30) * 10);
        }
      }
    });
    
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      coinsEarned,
      allMastered: completed === total && total > 0
    };
  };

  // Calculate total lesson statistics
  const getLessonStats = () => {
    if (!selectedLesson || !lessonProgress) return { completed: 0, total: 0, percent: 0, coinsEarned: 0, categoriesComplete: 0, totalCategories: 0 };
    
    const categories = Object.keys(selectedLesson.categories || {});
    let totalItems = 0;
    let completedItems = 0;
    let totalCoins = 0;
    let categoriesComplete = 0;
    
    categories.forEach(cat => {
      const stats = getCategoryStats(cat);
      totalItems += stats.total;
      completedItems += stats.completed;
      totalCoins += stats.coinsEarned;
      if (stats.allMastered) categoriesComplete++;
    });
    
    return {
      completed: completedItems,
      total: totalItems,
      percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      coinsEarned: totalCoins,
      categoriesComplete,
      totalCategories: categories.length
    };
  };

  // Auto-select lesson from URL param
  useEffect(() => {
    if (lessonIdParam && lessons) {
      const lesson = lessons.find(l => l.id === lessonIdParam);
      if (lesson) {
        setSelectedLesson(lesson);
        const cats = Object.keys(lesson.categories || {});
        if (cats.length > 0) setActiveCategory(cats[0]);
      }
    }
  }, [lessonIdParam, lessons]);

  // Get categories from selected lesson
  const lessonCategories = selectedLesson?.categories 
    ? Object.keys(selectedLesson.categories)
    : [];

  // Get practice items for active category
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

  const currentItem = practiceItemsWithMastery[currentItemIndex];
  const progressPercent = practiceItems.length > 0 
    ? ((currentItemIndex + 1) / practiceItems.length) * 100 
    : 0;

  const handleListen = () => {
    if (tts.isSpeaking) {
      tts.stop();
    } else if (currentItem) {
      tts.speak(currentItem.English);
    }
  };

  const handleStartRecording = async () => {
    try {
      setAnalysisResult(null);
      setCoinChange(null);
      await recorder.startRecording();
    } catch (error) {
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const handleStopRecording = async () => {
    if (!selectedLesson || !currentItem) return;
    
    setIsAnalyzing(true);
    setBonusMessage(null);
    
    try {
      const audioData = await recorder.stopRecording();
      
      if (!audioData.audioBuffer || audioData.audioBuffer.length === 0) {
        throw new Error("No audio recorded");
      }

      // Use local audio analysis with Supabase scoring config
      const result = await analyzeAudioAsync(
        audioData.audioBuffer,
        audioData.sampleRate,
        audioData.audioBase64 || undefined
      );

      setAnalysisResult(result);

      // Calculate base coin reward/penalty
      const score = result.overallScore;
      let coins = 0;
      let bonusMessages: string[] = [];
      
      if (coinConfig) {
        if (score >= (coinConfig.reward_score_threshold || 70)) {
          coins = Math.round(
            coinConfig.reward_min + 
            ((score - 70) / 30) * (coinConfig.reward_max - coinConfig.reward_min)
          );
        } else if (score < (coinConfig.penalty_score_threshold || 50)) {
          coins = -Math.round(
            coinConfig.penalty_min + 
            ((50 - score) / 50) * (coinConfig.penalty_max - coinConfig.penalty_min)
          );
        }
      } else {
        coins = score >= 70 ? Math.floor(score / 10) : (score < 50 ? -5 : 0);
      }

      // Save practice first to update progress
      await savePractice.mutateAsync({
        lessonId: selectedLesson.id,
        category: activeCategory,
        itemIndex: currentItemIndex,
        score,
        coinsEarned: coins,
        metrics: result.metrics
      });

      // Calculate bonuses AFTER saving (so progress is updated)
      let totalBonusCoins = 0;

      // 1. First-time practice bonus
      const currentProgress = lessonProgress?.find(
        p => p.category === activeCategory && p.item_index === currentItemIndex
      );
      const firstTimeBonus = getFirstTimePracticeBonus(
        currentProgress?.attempts || 1,
        coinConfig
      );
      if (firstTimeBonus > 0) {
        totalBonusCoins += firstTimeBonus;
        bonusMessages.push(`🎁 First Practice: +${firstTimeBonus}`);
      }

      // 2. Lesson milestone bonus (25%, 50%, 75%, 100%)
      if (lessonProgress && selectedLesson) {
        const progressStats = calculateLessonProgress(selectedLesson, lessonProgress);
        
        if (progressStats.milestoneAchieved) {
          const milestone = getMilestoneBonus(progressStats.milestoneAchieved, coinConfig);
          if (milestone) {
            totalBonusCoins += milestone.bonusCoins;
            bonusMessages.push(`${milestone.icon} ${milestone.label}: +${milestone.bonusCoins}`);
            
            // 2b. Check for deadline bonus/penalty when reaching milestones
            const lessonDeadline = lessonDeadlines?.find(d => d.lessonId === selectedLesson.id);
            if (lessonDeadline && progressStats.completionPercent >= 80) {
              const deadlineReward = calculateDeadlineReward(
                lessonDeadline,
                progressStats.completionPercent,
                coinConfig
              );
              
              if (deadlineReward.type === 'bonus') {
                totalBonusCoins += deadlineReward.amount;
                bonusMessages.push(`${deadlineReward.icon} ${deadlineReward.message}: +${deadlineReward.amount}`);
              } else if (deadlineReward.type === 'penalty') {
                totalBonusCoins -= deadlineReward.amount;
                bonusMessages.push(`${deadlineReward.icon} ${deadlineReward.message}: -${deadlineReward.amount}`);
              }
            }
          }
        }
      }

      // 3. Streak bonus (consecutive high scores)
      const recentScores = lessonProgress
        ?.filter(p => p.lesson_id === selectedLesson.id)
        .sort((a, b) => new Date(b.last_practiced_at || '').getTime() - new Date(a.last_practiced_at || '').getTime())
        .slice(0, 10)
        .map(p => p.best_score) || [];
      
      recentScores.unshift(score); // Add current score
      
      const streakBonus = calculateStreakBonus(recentScores, coinConfig);
      if (streakBonus) {
        totalBonusCoins += streakBonus.bonusCoins;
        bonusMessages.push(`🔥 ${streakBonus.label}: +${streakBonus.bonusCoins}`);
      }

      // Update wallet with bonus coins (positive or negative)
      if (totalBonusCoins !== 0) {
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (currentUser) {
          const newBalance = Math.max(0, (wallet?.balance || 0) + totalBonusCoins);
          const { error: bonusError } = await supabase
            .from('user_wallets')
            .update({
              balance: newBalance,
              total_earned: totalBonusCoins > 0 ? (wallet?.total_earned || 0) + totalBonusCoins : wallet?.total_earned || 0,
              total_spent: totalBonusCoins < 0 ? (wallet?.total_spent || 0) + Math.abs(totalBonusCoins) : wallet?.total_spent || 0
            })
            .eq('user_id', currentUser.id);

          if (!bonusError) {
            await supabase
              .from('coin_transactions')
              .insert({
                user_id: currentUser.id,
                amount: totalBonusCoins,
                transaction_type: totalBonusCoins > 0 ? 'bonus' : 'penalty',
                description: bonusMessages.join(' • '),
                reference_id: selectedLesson.id
              });
          }
        }
      }

      // Set final coin change (base + bonuses)
      setCoinChange(coins + totalBonusCoins);
      
      if (bonusMessages.length > 0) {
        setBonusMessage(bonusMessages.join('\n'));
      }

    } catch (error: any) {
      console.error("Error analyzing speech:", error);
      toast.error(error.message || "Failed to analyze speech");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    if (currentItemIndex < practiceItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setAnalysisResult(null);
      setCoinChange(null);
      setBonusMessage(null);
      recorder.resetRecording();
    } else {
      toast.success("Category complete! 🎉");
    }
  };

  const handlePrev = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setAnalysisResult(null);
      setCoinChange(null);
      setBonusMessage(null);
      recorder.resetRecording();
    }
  };

  const handleRetry = () => {
    setAnalysisResult(null);
    setCoinChange(null);
    setBonusMessage(null);
    recorder.resetRecording();
  };

  if (lessonsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No lesson selected - show lesson picker with multiple views
  if (!selectedLesson) {
    const handleSelectLesson = (lesson: Lesson) => {
      setSelectedLesson(lesson);
      const cats = Object.keys(lesson.categories || {});
      if (cats.length > 0) setActiveCategory(cats[0]);
    };

    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-6xl mx-auto">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-display font-bold">Select a Lesson</h1>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-card border border-border/50 rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="gap-2"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Week</span>
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </Button>
              </div>
            </div>

            {!lessons || lessons.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Enroll in a course to start practicing</p>
                  <Link to="/courses">
                    <Button>Browse Courses</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* List View (Original) */}
                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {lessons.map((lesson) => (
                      <motion.div
                        key={lesson.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 cursor-pointer transition-all"
                        onClick={() => handleSelectLesson(lesson)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                            {lesson.order_index}
                          </div>
                          <div>
                            <h3 className="font-medium">{lesson.lesson_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {Object.keys(lesson.categories || {}).length} categories
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && (
                  <LessonGridView
                    lessons={lessons}
                    lessonDeadlines={lessonDeadlines}
                    getLessonProgress={getLessonProgress}
                    onSelectLesson={handleSelectLesson}
                  />
                )}

                {/* Week View */}
                {viewMode === 'week' && (
                  <LessonWeekView
                    lessons={lessons}
                    lessonDeadlines={lessonDeadlines}
                    getLessonProgress={getLessonProgress}
                    onSelectLesson={handleSelectLesson}
                  />
                )}

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                  <LessonCalendarView
                    lessons={lessons}
                    lessonDeadlines={lessonDeadlines}
                    getLessonProgress={getLessonProgress}
                    onSelectLesson={handleSelectLesson}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedLesson(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-display font-bold">
                  {selectedLesson.lesson_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {activeCategory} • {currentItemIndex + 1}/{practiceItems.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/vocabulary?lesson=${selectedLesson.id}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Vocabulary</span>
                </Button>
              </Link>
              <CoinBadge amount={wallet?.balance || 0} showChange={coinChange || undefined} />
            </div>
          </div>

          {/* Deadline Indicator */}
          {selectedLesson && lessonDeadlines && (() => {
            const deadline = lessonDeadlines.find(d => d.lessonId === selectedLesson.id);
            if (!deadline) return null;
            
            const now = new Date();
            const deadlineDate = new Date(deadline.deadline);
            const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            let statusColor = "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30";
            let icon = "📅";
            let message = "";
            
            if (daysUntil < 0) {
              statusColor = "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30";
              icon = "⏰";
              message = `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`;
            } else if (daysUntil === 0) {
              statusColor = "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30";
              icon = "🎯";
              message = "Due today!";
            } else if (daysUntil <= 3) {
              statusColor = "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
              icon = "⚡";
              message = `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`;
            } else {
              message = `${daysUntil} days until deadline`;
            }
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mb-4 p-3 rounded-lg border flex items-center gap-2 text-sm font-medium",
                  statusColor
                )}
              >
                <span className="text-base">{icon}</span>
                <span>{message}</span>
                <span className="ml-auto text-xs opacity-70">
                  {deadlineDate.toLocaleDateString()}
                </span>
              </motion.div>
            );
          })()}

          {/* Progress Bar */}
          <Progress value={progressPercent} className="h-2 mb-4" />

          {/* Lesson Statistics Card */}
          {(() => {
            const lessonStats = getLessonStats();
            const categoryStats = getCategoryStats(activeCategory);
            
            return (
              <Card className="mb-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Lesson Progress */}
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Lesson Progress
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">{lessonStats.percent}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {lessonStats.completed}/{lessonStats.total} items
                      </span>
                    </div>

                    {/* Current Category */}
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {activeCategory}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {categoryStats.percent}%
                        </span>
                        {categoryStats.allMastered && (
                          <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {categoryStats.completed}/{categoryStats.total} items
                      </span>
                    </div>

                    {/* Coins Earned */}
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Coins Earned
                      </span>
                      <div className="flex items-baseline gap-1">
                        <Coins className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-1" />
                        <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {lessonStats.coinsEarned}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        from this lesson
                      </span>
                    </div>

                    {/* Categories Complete */}
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Categories
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {lessonStats.categoriesComplete}
                        </span>
                        <span className="text-lg text-muted-foreground">/ {lessonStats.totalCategories}</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        complete
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Category Tabs with Progress */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {lessonCategories.map((cat) => {
              const stats = getCategoryStats(cat);
              return (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveCategory(cat);
                    setCurrentItemIndex(0);
                    setAnalysisResult(null);
                  }}
                  className={cn(
                    "shrink-0 relative flex flex-col items-start h-auto py-2 px-3",
                    stats.allMastered && "border-green-500 dark:border-green-600"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{cat}</span>
                    {stats.allMastered && (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    )}
                  </div>
                  <div className="text-xs opacity-70 mt-0.5">
                    {stats.completed}/{stats.total} • {stats.percent}%
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Practice Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${currentItemIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="mb-6">
                <CardContent className="p-6">
                  {/* Item Progress Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Item {currentItemIndex + 1}/{practiceItems.length}
                        </span>
                      </div>
                      {currentItem?.mastered && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30">
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                            ⭐ MASTERED
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {currentItem?.bestScore > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-muted-foreground">Best Score</span>
                          <span className={cn(
                            "text-sm font-bold",
                            currentItem.bestScore >= 80 ? "text-green-600 dark:text-green-400" :
                            currentItem.bestScore >= 70 ? "text-blue-600 dark:text-blue-400" :
                            "text-orange-600 dark:text-orange-400"
                          )}>
                            {currentItem.bestScore}
                          </span>
                        </div>
                      )}
                      {currentItem?.attempts > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-muted-foreground">Attempts</span>
                          <span className="text-sm font-bold text-foreground">
                            {currentItem.attempts}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vietnamese Prompt */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Say in English
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowVietnamese(!showVietnamese)}
                      >
                        {showVietnamese ? <Eye size={16} /> : <EyeOff size={16} />}
                      </Button>
                    </div>
                    <p className={cn(
                      "text-xl font-medium transition-all",
                      !showVietnamese && "blur-sm select-none"
                    )}>
                      {currentItem?.Vietnamese}
                    </p>
                  </div>

                  {/* Recording Section */}
                  {!analysisResult ? (
                    <div className="text-center">
                      {recorder.isRecording ? (
                        <div className="space-y-4">
                          <AudioWaveform 
                            isRecording={true} 
                            audioLevel={recorder.getAudioLevel()} 
                          />
                          <Button 
                            size="lg" 
                            variant="destructive"
                            onClick={handleStopRecording}
                            className="w-full"
                          >
                            Stop Recording
                          </Button>
                        </div>
                      ) : isAnalyzing ? (
                        <div className="py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                          <p className="text-muted-foreground">Analyzing...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex gap-3 justify-center">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={handleListen}
                            >
                              <Volume2 size={20} />
                            </Button>
                          </div>
                          <Button 
                            size="lg" 
                            className="w-full gradient-primary glow-primary"
                            onClick={handleStartRecording}
                          >
                            <Mic className="w-5 h-5 mr-2" />
                            Start Recording
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Results with ScoreDisplay
                    <div className="space-y-6">
                      <ScoreDisplay 
                        analysisResult={analysisResult} 
                        coinChange={coinChange}
                      />

                      {/* Your Recording - Playback Button */}
                      {recorder.audioUrl && (
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={recorder.isPlaying ? recorder.stopPlayback : recorder.playRecording}
                            className="gap-2"
                          >
                            {recorder.isPlaying ? (
                              <>
                                <Square className="w-4 h-4" />
                                Stop Playback
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Listen to Your Recording
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Bonus Messages */}
                      {bonusMessage && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 text-sm"
                        >
                          <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                            <Coins className="w-4 h-4" />
                            Bonus Rewards!
                          </p>
                          {bonusMessage.split('\n').map((msg, i) => (
                            <p key={i} className="text-foreground font-medium">
                              {msg}
                            </p>
                          ))}
                        </motion.div>
                      )}

                      {/* Feedback messages */}
                      {analysisResult.feedback && analysisResult.feedback.length > 0 && (
                        <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 text-sm space-y-1">
                          {analysisResult.feedback.map((fb, i) => (
                            <p key={i} className="text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">💡</span>
                              <span>{fb}</span>
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Expected phrase */}
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-1">Expected:</p>
                        <p className="font-medium text-primary">{currentItem?.English}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={handleRetry}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                        <Button 
                          className="flex-1 gradient-primary"
                          onClick={handleNext}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {!analysisResult && (
            <div className="flex justify-between">
              <Button 
                variant="ghost" 
                onClick={handlePrev}
                disabled={currentItemIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleNext}
                disabled={currentItemIndex === practiceItems.length - 1}
              >
                Skip
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Item indicators */}
          <div className="flex justify-center gap-1.5 mt-6">
            {practiceItemsWithMastery.slice(0, 10).map((item: any, i: number) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentItemIndex(i);
                  setAnalysisResult(null);
                  recorder.resetRecording();
                }}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  i === currentItemIndex 
                    ? "bg-primary scale-125" 
                    : item.mastered 
                      ? "bg-success/50" 
                      : "bg-muted hover:bg-muted-foreground/30"
                )}
              />
            ))}
            {practiceItems.length > 10 && (
              <span className="text-xs text-muted-foreground ml-2">
                +{practiceItems.length - 10}
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Practice;