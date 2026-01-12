import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Volume2, 
  Mic, 
  Square, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { AudioWaveform } from "@/components/ui/AudioWaveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useCoinConfig } from "@/hooks/useCoinWallet";
import { useWallet } from "@/hooks/useUserData";
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
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [coinChange, setCoinChange] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionStats, setSessionStats] = useState({ 
    completed: 0, 
    totalScore: 0, 
    coinsEarned: 0 
  });

  const recorder = useAudioRecorder();
  const tts = useTextToSpeech();
  const { data: coinConfig } = useCoinConfig();
  const { data: wallet, refetch: refetchWallet } = useWallet();

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;

  // Metric labels for display
  const metricLabels: Record<string, string> = {
    volume: 'Volume',
    speechRate: 'Speed',
    pauses: 'Fluency',
    latency: 'Response',
    endIntensity: 'Energy'
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(startIndex);
      setShowEnglish(false);
      setAnalysisResult(null);
      setCoinChange(null);
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
      console.log('⏹️ Stopping recording...');
      
      // Stop recording - this now returns audio data directly when onstop completes
      const audioData = await recorder.stopRecording();
      
      console.log('✅ Recording stopped, got audio data:', {
        bufferLength: audioData.audioBuffer.length,
        sampleRate: audioData.sampleRate,
        hasBase64: !!audioData.audioBase64
      });
      
      // Analyze audio using working implementation from chunks-voice-energy
      const { analyzeAudioAsync } = await import('@/lib/audioAnalysis');
      
      console.log('🔄 Starting audio analysis...');
      const analysisResult = await analyzeAudioAsync(
        audioData.audioBuffer,
        audioData.sampleRate,
        audioData.audioBase64 || undefined
      );
      
      console.log('✅ Analysis complete:', analysisResult);

      setAnalysisResult(analysisResult);

      // Calculate coin reward/penalty
      const score = analysisResult.overallScore;
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

      // Update session stats
      setSessionStats(prev => ({
        completed: prev.completed + 1,
        totalScore: prev.totalScore + score,
        coinsEarned: prev.coinsEarned + coins
      }));

      // Refetch wallet to show updated balance
      refetchWallet();

    } catch (error: any) {
      console.error("Error analyzing speech:", error);
      const errorMessage = error.message || "Failed to analyze speech. Please try recording again.";
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
      const avgScore = sessionStats.completed > 0 
        ? Math.round(sessionStats.totalScore / sessionStats.completed) 
        : 0;
      
      toast.success("Practice session complete! 🎉", {
        description: `Average: ${avgScore}% | Coins: ${sessionStats.coinsEarned >= 0 ? '+' : ''}${sessionStats.coinsEarned}`
      });
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

  if (!isOpen) return null;

  const isLastItem = currentIndex === items.length - 1;
  const scoreColor = analysisResult 
    ? analysisResult.overallScore >= 80 
      ? "text-success" 
      : analysisResult.overallScore >= 60 
        ? "text-warning" 
        : "text-destructive"
    : "";

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
          className="w-full max-w-2xl bg-card rounded-3xl border border-border/50 overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
            <div>
              <h2 className="font-display font-semibold text-lg">{lessonName}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{category}</Badge>
                {sessionStats.completed > 0 && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Avg: {Math.round(sessionStats.totalScore / sessionStats.completed)}%
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
          <div className="px-6 py-3 bg-secondary/30">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                Item {currentIndex + 1} of {items.length}
              </span>
              <span className="font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Vietnamese Text */}
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-2">Say this in English:</p>
              <motion.p 
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-display font-semibold text-foreground"
              >
                {currentItem.vietnamese}
              </motion.p>
            </div>

            {/* English Reference */}
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
                    Recording... {Math.round(recorder.recordingTime / 1000)}s
                  </span>
                </div>
                <AudioWaveform 
                  isRecording={recorder.isRecording} 
                  audioLevel={recorder.getAudioLevel()} 
                  className="mx-auto"
                />
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
                {/* Score Circle */}
                <div className="text-center mb-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className={`inline-flex flex-col items-center justify-center w-32 h-32 rounded-2xl ${
                      analysisResult.overallScore >= 80 
                        ? "bg-success/10 border-4 border-success/30" 
                        : analysisResult.overallScore >= 60
                          ? "bg-warning/10 border-4 border-warning/30"
                          : "bg-destructive/10 border-4 border-destructive/30"
                    }`}
                  >
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`text-4xl font-display font-bold ${scoreColor}`}
                    >
                      {analysisResult.overallScore}
                    </motion.span>
                    <span className="text-xs text-muted-foreground">points</span>
                    {analysisResult.overallScore >= 80 && (
                      <CheckCircle2 className="w-5 h-5 text-success mt-1" />
                    )}
                  </motion.div>

                  {/* Coin change indicator */}
                  {coinChange !== null && coinChange !== 0 && (
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className={`mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                        coinChange > 0 
                          ? "bg-success/10 text-success" 
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <span className="text-lg">🪙</span>
                      {coinChange > 0 ? '+' : ''}{coinChange}
                    </motion.div>
                  )}
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                {Object.entries(analysisResult.metrics).map(([key, value], index) => {
                    const numValue = typeof value === 'number' ? value : 0;
                    return (
                      <motion.div 
                        key={key} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="text-center p-3 rounded-xl bg-secondary/50 border border-border/50"
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {metricLabels[key] || key}
                        </div>
                        <div className={`text-2xl font-bold ${
                          numValue >= 80 ? "text-success" 
                            : numValue >= 60 ? "text-warning" 
                            : "text-destructive"
                        }`}>
                          {numValue}%
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Feedback */}
                {analysisResult.feedback && analysisResult.feedback.length > 0 && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm mb-6">
                    {analysisResult.feedback.map((fb, i) => (
                      <p key={i} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">💡</span>
                        <span>{fb}</span>
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            {!isAnalyzing && (
              <div className="flex items-center justify-center gap-4">
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

                {analysisResult && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleRetry}
                    className="gap-2"
                  >
                    <RotateCcw size={20} />
                    Retry
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="p-6 border-t border-border/50 flex items-center justify-between bg-secondary/20">
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
