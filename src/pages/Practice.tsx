import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Mic, 
  Volume2, 
  Square, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  History,
  Target,
  Flame,
  Trophy,
  Calendar,
  Clock
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { CategoryTabs } from "@/components/dashboard/CategoryTabs";
import { useAuth } from "@/context/AuthContext";
import { useEnrollments, useCourseLessons, Lesson } from "@/hooks/useCourses";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { 
  useTranscribe, 
  useAnalyzeSpeech, 
  useSavePractice, 
  usePracticeHistory,
  useUserProgress,
  useUserStats,
  SpeechAnalysisResult 
} from "@/hooks/usePractice";
import { useCoinConfig } from "@/hooks/useCoinWallet";
import { useWallet } from "@/hooks/useUserData";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const Practice = () => {
  const [searchParams] = useSearchParams();
  const lessonIdParam = searchParams.get("lesson");
  
  const { user } = useAuth();
  const { data: enrollments } = useEnrollments();
  const { data: wallet } = useWallet();
  const { data: coinConfig } = useCoinConfig();
  const { data: userStats } = useUserStats();
  
  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
  const firstCourseId = enrolledCourseIds[0];
  
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(firstCourseId || null);
  
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SpeechAnalysisResult | null>(null);
  const [coinChange, setCoinChange] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [isPracticing, setIsPracticing] = useState(false);

  const recorder = useAudioRecorder();
  const tts = useTextToSpeech();
  const transcribe = useTranscribe();
  const analyze = useAnalyzeSpeech();
  const savePractice = useSavePractice();

  const { data: lessonProgress } = useUserProgress(selectedLesson?.id);
  const { data: practiceHistory } = usePracticeHistory(selectedLesson?.id);

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
    ? Object.entries(selectedLesson.categories).map(([name, items]) => ({
        id: name.toLowerCase(),
        name,
        count: (items as any[]).length
      }))
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
  const progress = practiceItems.length > 0 
    ? ((currentItemIndex + 1) / practiceItems.length) * 100 
    : 0;

  // Calculate lesson stats
  const lessonStats = {
    totalItems: practiceItems.length,
    mastered: practiceItemsWithMastery.filter((i: any) => i.mastered).length,
    practiced: practiceItemsWithMastery.filter((i: any) => i.attempts > 0).length,
    avgScore: practiceHistory?.length 
      ? Math.round(practiceHistory.reduce((sum, h) => sum + h.score, 0) / practiceHistory.length)
      : 0
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    const cats = Object.keys(lesson.categories || {});
    if (cats.length > 0) setActiveCategory(cats[0]);
    setCurrentItemIndex(0);
    setIsPracticing(false);
    setAnalysisResult(null);
  };

  const handleStartPractice = () => {
    setIsPracticing(true);
    setCurrentItemIndex(0);
    setAnalysisResult(null);
    setCoinChange(null);
  };

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
      setRecordingStartTime(Date.now());
      await recorder.startRecording();
    } catch (error) {
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const handleStopRecording = async () => {
    if (!selectedLesson || !currentItem) return;
    
    setIsAnalyzing(true);
    const latency = Date.now() - recordingStartTime;
    
    try {
      const audioData = await recorder.stopRecording();
      const audioBase64 = audioData.audioBase64;
      
      if (!audioBase64) {
        throw new Error("No audio recorded");
      }

      // Transcribe the audio
      const transcriptionResult = await transcribe.mutateAsync(audioBase64);
      
      // Calculate metrics based on recording
      const metrics = {
        volume: -25 + Math.random() * 10,
        speechRate: transcriptionResult.wordsPerMinute,
        pauseCount: Math.floor(Math.random() * 3),
        longestPause: Math.floor(Math.random() * 1000),
        latency: Math.min(latency, 3000),
        endIntensity: 70 + Math.random() * 30
      };

      // Analyze speech
      const result = await analyze.mutateAsync({
        transcription: transcriptionResult.transcript,
        metrics
      });

      setAnalysisResult(result);

      // Calculate coin reward/penalty
      const score = result.score;
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

      // Save practice result
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
      setShowEnglish(false);
      recorder.resetRecording();
    } else {
      toast.success("Practice session complete! 🎉");
      setIsPracticing(false);
    }
  };

  const handlePrev = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setAnalysisResult(null);
      setCoinChange(null);
      setShowEnglish(false);
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Practice
            </h1>
            <p className="text-muted-foreground">
              Record your voice and get instant feedback on pronunciation
            </p>
          </motion.div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{userStats?.streak || 0}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <Target className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{userStats?.avgScore || 0}%</div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <History className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{userStats?.totalPractice || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Practices</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <CoinBadge amount={wallet?.balance || 0} size="lg" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lesson Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Select Lesson
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
                  {!lessons || lessons.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Enroll in a course to see lessons
                    </p>
                  ) : (
                    lessons.map((lesson) => {
                      const isSelected = selectedLesson?.id === lesson.id;
                      const lessonCats = Object.keys(lesson.categories || {});
                      const totalItems = lessonCats.reduce(
                        (sum, cat) => sum + ((lesson.categories as any)?.[cat]?.length || 0),
                        0
                      );
                      
                      return (
                        <motion.button
                          key={lesson.id}
                          onClick={() => handleSelectLesson(lesson)}
                          whileHover={{ x: 4 }}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary/30"
                              : "bg-card border-border/50 hover:border-primary/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              Day {lesson.order_index}
                            </span>
                            {lesson.deadline_date && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(lesson.deadline_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </Badge>
                            )}
                          </div>
                          <div className="font-semibold text-foreground mb-2">
                            {lesson.lesson_name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{lessonCats.length} categories</span>
                            <span>•</span>
                            <span>{totalItems} items</span>
                          </div>
                        </motion.button>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Practice Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2"
            >
              {!selectedLesson ? (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center py-16">
                    <Mic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Select a Lesson</h3>
                    <p className="text-muted-foreground">
                      Choose a lesson from the left panel to start practicing
                    </p>
                  </CardContent>
                </Card>
              ) : !isPracticing ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedLesson.lesson_name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Day {selectedLesson.order_index}
                        </p>
                      </div>
                      <CoinBadge amount={wallet?.balance || 0} showChange={coinChange || undefined} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview">
                      <TabsList className="mb-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview">
                        {/* Category Selection */}
                        <div className="mb-6">
                          <h4 className="text-sm font-medium mb-3">Categories</h4>
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
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-3 mb-6">
                          <div className="text-center p-3 rounded-lg bg-secondary/30">
                            <div className="text-2xl font-bold">{lessonStats.totalItems}</div>
                            <div className="text-xs text-muted-foreground">Total Items</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-success/10">
                            <div className="text-2xl font-bold text-success">{lessonStats.mastered}</div>
                            <div className="text-xs text-muted-foreground">Mastered</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-primary/10">
                            <div className="text-2xl font-bold text-primary">{lessonStats.practiced}</div>
                            <div className="text-xs text-muted-foreground">Practiced</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-accent/10">
                            <div className="text-2xl font-bold">{lessonStats.avgScore}%</div>
                            <div className="text-xs text-muted-foreground">Avg Score</div>
                          </div>
                        </div>

                        {/* Items Preview */}
                        <div className="space-y-2 max-h-[200px] overflow-y-auto mb-6">
                          {practiceItemsWithMastery.slice(0, 5).map((item: any, i: number) => (
                            <div 
                              key={i}
                              className={`p-3 rounded-lg border ${
                                item.mastered 
                                  ? "bg-success/5 border-success/20" 
                                  : "bg-card border-border/50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{item.Vietnamese}</p>
                                  <p className="text-sm text-muted-foreground">{item.English}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.mastered && (
                                    <CheckCircle2 className="w-5 h-5 text-success" />
                                  )}
                                  {item.bestScore > 0 && (
                                    <Badge variant="secondary">{item.bestScore}%</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {practiceItemsWithMastery.length > 5 && (
                            <p className="text-center text-sm text-muted-foreground">
                              +{practiceItemsWithMastery.length - 5} more items
                            </p>
                          )}
                        </div>

                        <Button 
                          size="lg" 
                          className="w-full gradient-primary text-primary-foreground"
                          onClick={handleStartPractice}
                          disabled={practiceItems.length === 0}
                        >
                          <Mic className="w-5 h-5 mr-2" />
                          Start Practice ({activeCategory})
                        </Button>
                      </TabsContent>

                      <TabsContent value="history">
                        {practiceHistory?.length === 0 ? (
                          <div className="text-center py-12">
                            <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              No practice history for this lesson yet
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {practiceHistory?.map((history) => (
                              <div 
                                key={history.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30"
                              >
                                <div>
                                  <div className="font-medium">{history.category}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Item #{history.item_index + 1} • {formatDistanceToNow(new Date(history.practiced_at), { addSuffix: true })}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-lg font-bold ${
                                    history.score >= 70 ? "text-success" : "text-muted-foreground"
                                  }`}>
                                    {history.score}%
                                  </div>
                                  <div className={`text-sm ${
                                    history.coins_earned >= 0 ? "text-success" : "text-destructive"
                                  }`}>
                                    {history.coins_earned >= 0 ? "+" : ""}{history.coins_earned} coins
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                /* Active Practice Session */
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedLesson.lesson_name} - {activeCategory}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Item {currentItemIndex + 1} of {practiceItems.length}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <CoinBadge amount={wallet?.balance || 0} showChange={coinChange || undefined} />
                        <Button variant="outline" size="sm" onClick={() => setIsPracticing(false)}>
                          Exit
                        </Button>
                      </div>
                    </div>
                    <Progress value={progress} className="mt-4" />
                  </CardHeader>
                  <CardContent className="py-8">
                    {currentItem && (
                      <>
                        {/* Vietnamese Text */}
                        <div className="text-center mb-8">
                          <p className="text-sm text-muted-foreground mb-2">Say this in English:</p>
                          <motion.p 
                            key={currentItemIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-display font-semibold text-foreground"
                          >
                            {currentItem.Vietnamese}
                          </motion.p>
                        </div>

                        {/* English Reference */}
                        <div className="mb-8 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowEnglish(!showEnglish)}
                            className="text-muted-foreground"
                          >
                            {showEnglish ? <EyeOff size={16} /> : <Eye size={16} />}
                            <span className="ml-2">{showEnglish ? "Hide Answer" : "Show Answer"}</span>
                          </Button>
                          <AnimatePresence>
                            {showEnglish && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 p-4 rounded-xl bg-secondary/30 border border-border/50"
                              >
                                <p className="text-lg text-primary">{currentItem.English}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Recording Indicator */}
                        {recorder.isRecording && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-6"
                          >
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                              <span className="text-sm text-muted-foreground">
                                Recording... {Math.round(recorder.recordingTime / 1000)}s
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden max-w-md mx-auto">
                              <motion.div 
                                className="h-full bg-primary"
                                style={{ width: `${recorder.getAudioLevel() * 100}%` }}
                              />
                            </div>
                          </motion.div>
                        )}

                        {/* Analysis Result */}
                        {analysisResult && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mb-8"
                          >
                            <div className="text-center mb-4">
                              <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-2xl ${
                                analysisResult.score >= 70 
                                  ? "bg-success/10 border border-success/30" 
                                  : "bg-destructive/10 border border-destructive/30"
                              }`}>
                                {analysisResult.score >= 70 ? (
                                  <CheckCircle2 className="w-8 h-8 text-success" />
                                ) : (
                                  <XCircle className="w-8 h-8 text-destructive" />
                                )}
                                <span className={`text-4xl font-display font-bold ${
                                  analysisResult.score >= 70 ? "text-success" : "text-destructive"
                                }`}>
                                  {analysisResult.score}
                                </span>
                                <span className="text-muted-foreground">points</span>
                              </div>
                            </div>

                            {/* Metrics Breakdown */}
                            <div className="grid grid-cols-5 gap-2 mb-4 max-w-lg mx-auto">
                              {Object.entries(analysisResult.metrics).map(([key, value]) => (
                                <div key={key} className="text-center p-2 rounded-lg bg-secondary/30">
                                  <div className="text-xs text-muted-foreground capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </div>
                                  <div className={`text-sm font-semibold ${
                                    value >= 70 ? "text-success" : value >= 50 ? "text-warning" : "text-destructive"
                                  }`}>
                                    {value}%
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Feedback */}
                            {analysisResult.feedback.length > 0 && (
                              <div className="p-4 rounded-xl bg-secondary/20 max-w-lg mx-auto">
                                {analysisResult.feedback.map((fb, i) => (
                                  <p key={i} className="text-sm text-muted-foreground">{fb}</p>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={handleListen}
                            disabled={isAnalyzing}
                          >
                            <Volume2 className={`mr-2 ${tts.isSpeaking ? "animate-pulse" : ""}`} size={20} />
                            {tts.isSpeaking ? "Speaking..." : "Listen"}
                          </Button>

                          <Button
                            size="lg"
                            onClick={recorder.isRecording ? handleStopRecording : handleStartRecording}
                            disabled={isAnalyzing}
                            className={`w-40 ${
                              recorder.isRecording 
                                ? "bg-destructive hover:bg-destructive/90" 
                                : "gradient-primary text-primary-foreground"
                            }`}
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="mr-2 animate-spin" size={20} />
                                Analyzing...
                              </>
                            ) : recorder.isRecording ? (
                              <>
                                <Square className="mr-2" size={20} />
                                Stop
                              </>
                            ) : (
                              <>
                                <Mic className="mr-2" size={20} />
                                Record
                              </>
                            )}
                          </Button>

                          {analysisResult && (
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={handleRetry}
                            >
                              <RotateCcw className="mr-2" size={20} />
                              Retry
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>

                  {/* Navigation */}
                  <div className="p-6 border-t border-border/50 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={handlePrev}
                      disabled={currentItemIndex === 0 || recorder.isRecording || isAnalyzing}
                    >
                      <ChevronLeft className="mr-2" size={20} />
                      Previous
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={recorder.isRecording || isAnalyzing}
                    >
                      {currentItemIndex === practiceItems.length - 1 ? "Complete" : "Next"}
                      <ChevronRight className="ml-2" size={20} />
                    </Button>
                  </div>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Practice;
