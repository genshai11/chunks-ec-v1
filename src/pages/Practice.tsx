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
  ArrowLeft
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { AudioWaveform } from "@/components/ui/AudioWaveform";
import { ScoreDisplay } from "@/components/practice/ScoreDisplay";
import { useEnrollments, useCourseLessons, Lesson } from "@/hooks/useCourses";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSavePractice, useUserProgress } from "@/hooks/usePractice";
import { analyzeAudioAsync, AnalysisResult } from "@/lib/audioAnalysis";
import { useCoinConfig } from "@/hooks/useCoinWallet";
import { useWallet } from "@/hooks/useUserData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Practice = () => {
  const [searchParams] = useSearchParams();
  const lessonIdParam = searchParams.get("lesson");
  
  const { data: enrollments } = useEnrollments();
  const { data: wallet } = useWallet();
  const { data: coinConfig } = useCoinConfig();
  
  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
  const firstCourseId = enrolledCourseIds[0];
  
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(firstCourseId || null);
  
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [coinChange, setCoinChange] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const recorder = useAudioRecorder();
  const tts = useTextToSpeech();
  const savePractice = useSavePractice();

  const { data: lessonProgress } = useUserProgress(selectedLesson?.id);

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

      // Calculate coin reward/penalty
      const score = result.overallScore;
      let coins = 0;
      
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

      setCoinChange(coins);

      await savePractice.mutateAsync({
        lessonId: selectedLesson.id,
        category: activeCategory,
        itemIndex: currentItemIndex,
        score,
        coinsEarned: coins,
        metrics: result.metrics
      });

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
      recorder.resetRecording();
    }
  };

  const handleRetry = () => {
    setAnalysisResult(null);
    setCoinChange(null);
    recorder.resetRecording();
  };

  if (lessonsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No lesson selected - show lesson picker
  if (!selectedLesson) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-display font-bold mb-6">Select a Lesson</h1>
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
              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 cursor-pointer transition-all"
                    onClick={() => {
                      setSelectedLesson(lesson);
                      const cats = Object.keys(lesson.categories || {});
                      if (cats.length > 0) setActiveCategory(cats[0]);
                    }}
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
            <CoinBadge amount={wallet?.balance || 0} showChange={coinChange || undefined} />
          </div>

          {/* Progress Bar */}
          <Progress value={progressPercent} className="h-2 mb-6" />

          {/* Category Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {lessonCategories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentItemIndex(0);
                  setAnalysisResult(null);
                }}
                className="shrink-0"
              >
                {cat}
              </Button>
            ))}
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