import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Volume2, 
  Mic, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { ResultsView } from "@/components/practice/ResultsView";
import { PracticeCameraFeed } from "@/components/practice/PracticeCameraFeed";
import { RecordingWaveform } from "@/components/practice/RecordingWaveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useCoinConfig } from "@/hooks/useCoinWallet";
import { useWallet } from "@/hooks/useUserData";
import { usePracticeIngest, useSavePractice } from "@/hooks/usePractice";
import { analyzeAudioAsync, AnalysisResult } from "@/lib/audioAnalysis";
import { toast } from "sonner";

interface PracticeItem {
  english: string;
  vietnamese: string;
  mastered?: boolean;
}

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonName: string;
  category: string;
  items: PracticeItem[];
  startIndex?: number;
}

export const PracticeModal = ({
  isOpen,
  onClose,
  lessonId,
  lessonName,
  category,
  items,
  startIndex = 0,
}: PracticeModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showEnglish, setShowEnglish] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [coinChange, setCoinChange] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hideNavigation, setHideNavigation] = useState(false);
  const [sessionStats, setSessionStats] = useState({ 
    completed: 0, 
    totalScore: 0, 
    coinsEarned: 0 
  });

  const recorder = useAudioRecorder();
  const tts = useTextToSpeech();
  const { data: coinConfig } = useCoinConfig();
  const { data: wallet, refetch: refetchWallet } = useWallet();
  const practiceIngest = usePracticeIngest();
  const savePractice = useSavePractice();

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;


  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(startIndex);
      setShowEnglish(false);
      setAnalysisResult(null);
      setCoinChange(null);
      setHideNavigation(false);
      setSessionStats({ completed: 0, totalScore: 0, coinsEarned: 0 });
      recorder.resetRecording();
    }
  }, [isOpen, startIndex, recorder]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(startIndex);
    }
  }, [isOpen, startIndex]);

  const handleListen = () => {
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      tts.speak(currentItem.english);
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
    setIsAnalyzing(true);
    
    try {
      console.log("Stopping recording...");
      
      const audioData = await recorder.stopRecording();
      
      console.log("Recording stopped, got audio data:", {
        bufferLength: audioData.audioBuffer.length,
        sampleRate: audioData.sampleRate,
        hasBase64: !!audioData.audioBase64
      });
      
      // Use local audio analysis with Supabase scoring config
      console.log("Starting audio analysis...");
      const result = await analyzeAudioAsync(
        audioData.audioBuffer,
        audioData.sampleRate,
        { audioBlob: audioData.audioBlob ?? undefined, audioBase64: audioData.audioBase64 ?? undefined }
      );
      
      console.log("Analysis complete:", result);

      setAnalysisResult(result);

      // Persist normalized backend records (take/transcript/score)
      if (audioData.audioBlob) {
        try {
          await practiceIngest.mutateAsync({
            audioBlob: audioData.audioBlob,
            lessonId,
            category,
            itemIndex: currentIndex,
            metrics: {
              volume: result.volume.averageDb,
              speechRate: result.speechRate.wordsPerMinute,
              pauseCount: result.pauseManagement.pauseCount,
              longestPause: Math.round(result.pauseManagement.maxPauseDuration * 1000),
              latency: result.responseTime.responseTimeMs,
              endIntensity: result.acceleration.score,
            },
            scoreOnServer: true,
          });
        } catch (e) {
          console.warn('practice-ingest failed:', e);
        }
      }

      // Calculate coin reward/penalty
      const score = result.overallScore;
      let coins = 0;
      
      if (coinConfig) {
        const rewardThreshold = coinConfig.reward_score_threshold ?? 70;
        const penaltyThreshold = coinConfig.penalty_score_threshold ?? 50;
        const rewardMin = coinConfig.reward_min ?? 0;
        const rewardMax = coinConfig.reward_max ?? rewardMin;
        const penaltyMin = coinConfig.penalty_min ?? 0;
        const penaltyMax = coinConfig.penalty_max ?? penaltyMin;

        if (score >= rewardThreshold) {
          coins = Math.round(
            rewardMin + 
            ((score - rewardThreshold) / Math.max(1, 100 - rewardThreshold)) * (rewardMax - rewardMin)
          );
        } else if (score < penaltyThreshold) {
          coins = -Math.round(
            penaltyMin + 
            ((penaltyThreshold - score) / Math.max(1, penaltyThreshold)) * (penaltyMax - penaltyMin)
          );
        }
      } else {
        coins = score >= 70 ? Math.floor(score / 10) : (score < 50 ? -5 : 0);
      }
      coins = Number.isFinite(coins) ? coins : 0;

      setCoinChange(coins);

      // Save practice history/progress for dashboard + progress pages
      if (lessonId && category) {
        try {
          await savePractice.mutateAsync({
            lessonId,
            category,
            itemIndex: currentIndex,
            score: Number.isFinite(score) ? score : 0,
            coinsEarned: Number.isFinite(coins) ? coins : 0,
            metrics: {
              volume: result.volume.averageDb,
              speechRate: result.speechRate.wordsPerMinute,
              pauseCount: result.pauseManagement.pauseCount,
              longestPause: Math.round(result.pauseManagement.maxPauseDuration * 1000),
              latency: result.responseTime.responseTimeMs,
              endIntensity: result.acceleration.score,
            },
          });
        } catch (saveError) {
          console.warn("practice save failed:", saveError);
          toast.warning("Result analyzed, but saving failed. Please retry once.");
        }
      }

      // Update session stats
      setSessionStats(prev => ({
        completed: prev.completed + 1,
        totalScore: prev.totalScore + score,
        coinsEarned: prev.coinsEarned + coins
      }));

      // Refetch wallet to show updated balance
      refetchWallet();

    } catch (error: unknown) {
      console.error("Error analyzing speech:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to analyze speech. Please try recording again.";
      toast.error(errorMessage, {
        description: "Make sure you spoke clearly and your microphone is working."
      });
      
      // Reset recording for retry
      recorder.resetRecording();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnalysisResult(null);
      setCoinChange(null);
      setShowEnglish(false);
      recorder.resetRecording();
    } else {
      // Session complete - show summary with coins
      const avgScore = sessionStats.completed > 0 
        ? Math.round(sessionStats.totalScore / sessionStats.completed) 
        : 0;
      
      const safeCoins = Number.isFinite(sessionStats.coinsEarned) ? sessionStats.coinsEarned : 0;
      const coinText = safeCoins >= 0 
        ? `+${safeCoins} coins` 
        : `${safeCoins} coins`;
      
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Practice Complete!</span>
          <div className="flex items-center gap-4 text-sm">
            <span>Avg: <strong>{avgScore}%</strong></span>
            <span>Items: <strong>{sessionStats.completed}</strong></span>
            <span className={safeCoins >= 0 ? "text-green-600" : "text-red-500"}>
              {coinText}
            </span>
          </div>
        </div>,
        { duration: 5000 }
      );
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
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

  const canInteract = useMemo(
    () => isOpen && !isAnalyzing && !analysisResult,
    [isOpen, isAnalyzing, analysisResult]
  );

  const handleCameraTap = async () => {
    if (!canInteract) return;
    if (recorder.isRecording) {
      await handleStopRecording();
    } else {
      await handleStartRecording();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      void handleCameraTap();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, canInteract, recorder.isRecording, isAnalyzing, analysisResult]);

  if (!isOpen) return null;

  const isLastItem = currentIndex === items.length - 1;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-[920px] bg-card rounded-3xl border border-border/50 overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent shrink-0">
            <div>
              <h2 className="font-display font-semibold text-base md:text-lg">{lessonName}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <Badge variant="secondary">{category}</Badge>
                {sessionStats.completed > 0 && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Avg: {Math.round(sessionStats.totalScore / sessionStats.completed)}%
                  </span>
                )}
                {isAnalyzing && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Audio analyzing...
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CoinBadge 
                amount={wallet?.balance || 0} 
                showChange={coinChange || undefined} 
              />
              <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10">
                <X size={20} />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="px-4 md:px-6 py-3 bg-secondary/30 shrink-0">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                Item {currentIndex + 1} of {items.length}
              </span>
              <span className="font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            {/* Vietnamese Text */}
            {!recorder.isRecording && (
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground mb-2">Say this in English:</p>
                <motion.p 
                  key={currentIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl md:text-2xl font-display font-semibold text-foreground"
                >
                  {currentItem.vietnamese}
                </motion.p>
              </div>
            )}

            {/* English Reference */}
            {!recorder.isRecording && (
            <div className="mb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEnglish(!showEnglish)}
                className="mx-auto flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                {showEnglish ? <EyeOff size={16} /> : <Eye size={16} />}
                {showEnglish ? "Hide Answer" : "Show Answer"}
              </Button>
              <AnimatePresence>
                {showEnglish && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 text-center p-4 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    <p className="text-lg text-primary font-medium">{currentItem.english}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            {/* Camera Practice UI (visual only, no face metrics scoring) */}
            <div className="mb-6">
              <PracticeCameraFeed
                isRecording={recorder.isRecording}
                audioLevel={recorder.getAudioLevel()}
                onTap={() => void handleCameraTap()}
                hintText={recorder.isRecording ? "Tap or press Space to stop" : "Tap or press Space to record"}
              />
            </div>

            {/* Audio Waveform while recording */}
            {recorder.isRecording && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-destructive">
                    Recording... {Math.round(recorder.recordingTime)}s
                  </span>
                </div>
                <RecordingWaveform getAudioLevel={recorder.getAudioLevel} isActive={recorder.isRecording} />
              </motion.div>
            )}

            {/* Analyzing State */}
            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 text-center py-8"
              >
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Analyzing your pronunciation...</p>
              </motion.div>
            )}

            {/* Analysis Result */}
            {analysisResult && !isAnalyzing && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-8"
              >
                <ResultsView result={analysisResult} coinChange={coinChange} onRetry={handleRetry} />
              </motion.div>
            )}

            {/* Action Buttons */}
            {!isAnalyzing && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleListen}
                  disabled={recorder.isRecording}
                  className="gap-2"
                >
                  <Volume2 size={20} className={tts.isSpeaking ? "animate-pulse text-primary" : ""} />
                  {tts.isSpeaking ? "Speaking..." : "Listen"}
                </Button>

                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    onClick={recorder.isRecording ? handleStopRecording : handleStartRecording}
                    className={`gap-2 w-40 ${
                      recorder.isRecording 
                        ? "bg-destructive hover:bg-destructive/90" 
                        : "gradient-primary text-primary-foreground"
                    }`}
                  >
                    {recorder.isRecording ? (
                      <>
                        <Square size={20} />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic size={20} />
                        Record
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
          </div>

          {/* Footer Navigation */}
          {!hideNavigation && (
          <div className="p-4 md:p-6 border-t border-border/50 flex items-center justify-between bg-secondary/20 shrink-0">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentIndex === 0 || recorder.isRecording || isAnalyzing}
              className="gap-2"
            >
              <ChevronLeft size={20} />
              Previous
            </Button>
            
            <div className="text-sm text-muted-foreground">
              {sessionStats.completed > 0 && (
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {sessionStats.completed} completed
                </span>
              )}
            </div>

            <Button
              variant="default"
              onClick={handleNext}
              disabled={recorder.isRecording || isAnalyzing}
              className="gap-2"
            >
              {isLastItem ? "Complete" : "Next"}
              <ChevronRight size={20} className="ml-2" />
            </Button>
          </div>
          )}
          <div className="px-4 pb-4 md:px-6 md:pb-6 bg-secondary/20 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHideNavigation((v) => !v)}
              className="text-xs text-muted-foreground"
            >
              {hideNavigation ? "Show navigation" : "Hide navigation"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};



