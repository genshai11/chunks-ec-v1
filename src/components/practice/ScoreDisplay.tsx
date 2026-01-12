import { motion } from "framer-motion";
import { 
  Volume2, 
  Zap, 
  TrendingUp, 
  Clock, 
  Waves 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  overallScore: number;
  emotionalFeedback: "excellent" | "good" | "poor";
  metrics: {
    volume: number;
    speechRate: number;
    pauses: number;
    latency: number;
    endIntensity: number;
  };
  volume?: { averageDb: number };
  speechRate?: { wordsPerMinute: number };
  pauseManagement?: { pauseCount: number };
  responseTime?: { responseTimeMs: number };
  acceleration?: { isAccelerating: boolean };
}

interface ScoreDisplayProps {
  analysisResult: AnalysisResult;
  coinChange?: number | null;
  className?: string;
}

const FEEDBACK_LABELS: Record<string, { label: string; color: string }> = {
  excellent: { label: "Excellent Energy!", color: "text-success" },
  good: { label: "Good Energy", color: "text-amber-400" },
  poor: { label: "Low Energy", color: "text-destructive" },
};

export const ScoreDisplay = ({ analysisResult, coinChange, className }: ScoreDisplayProps) => {
  const score = analysisResult.overallScore;
  const feedback = FEEDBACK_LABELS[analysisResult.emotionalFeedback] || FEEDBACK_LABELS.good;
  
  // Calculate gradient position based on score (0-100 → 0-360 degrees)
  const strokeDashoffset = 440 - (440 * score) / 100;
  
  // Score color based on value
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-success";
    if (s >= 60) return "text-amber-400";
    if (s >= 40) return "text-orange-400";
    return "text-destructive";
  };

  const metrics = [
    {
      key: "volume",
      icon: Volume2,
      score: analysisResult.metrics.volume,
      raw: `${Math.round(analysisResult.volume?.averageDb || -30)}dB`,
      color: "text-amber-400",
    },
    {
      key: "speechRate",
      icon: Zap,
      score: analysisResult.metrics.speechRate,
      raw: `${analysisResult.speechRate?.wordsPerMinute || 0}WPM`,
      color: "text-amber-400",
    },
    {
      key: "acceleration",
      icon: TrendingUp,
      score: analysisResult.metrics.endIntensity,
      raw: analysisResult.acceleration?.isAccelerating ? "↑" : "→",
      color: "text-emerald-400",
    },
    {
      key: "latency",
      icon: Clock,
      score: analysisResult.metrics.latency,
      raw: `${analysisResult.responseTime?.responseTimeMs || 0}ms`,
      color: "text-emerald-400",
    },
    {
      key: "pauses",
      icon: Waves,
      score: analysisResult.metrics.pauses,
      raw: `${analysisResult.pauseManagement?.pauseCount || 0}`,
      color: "text-rose-400",
    },
  ];

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Lightning Bolt Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
        className="relative"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          className="drop-shadow-lg"
        >
          <defs>
            <linearGradient id="boltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
          </defs>
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            fill="url(#boltGradient)"
            stroke="#f97316"
            strokeWidth="0.5"
          />
        </svg>
      </motion.div>

      {/* Circular Score Ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
        className="relative w-44 h-44"
      >
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="75%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          
          {/* Background track */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/30"
          />
          
          {/* Animated score arc */}
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="440"
            initial={{ strokeDashoffset: 440 }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.6 }}
            className={cn("text-5xl font-display font-bold", getScoreColor(score))}
          >
            {score}
          </motion.span>
          <span className="text-sm text-muted-foreground">/100 points</span>
        </div>
      </motion.div>

      {/* Emotional Feedback Label */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className={cn("text-xl font-display font-semibold", feedback.color)}
      >
        {feedback.label}
      </motion.p>

      {/* Coin Change Indicator */}
      {coinChange !== null && coinChange !== undefined && coinChange !== 0 && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold",
            coinChange > 0
              ? "bg-success/20 text-success"
              : "bg-destructive/20 text-destructive"
          )}
        >
          <span className="text-lg">🪙</span>
          {coinChange > 0 ? "+" : ""}
          {coinChange}
        </motion.div>
      )}

      {/* 5 Metrics Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="w-full max-w-md mt-2"
      >
        <div className="grid grid-cols-5 gap-1 p-3 rounded-2xl bg-card/80 backdrop-blur border border-border/50 shadow-lg">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="flex flex-col items-center py-2"
              >
                <Icon className={cn("w-5 h-5 mb-1", metric.color)} />
                <span className={cn("text-xl font-bold", getScoreColor(metric.score))}>
                  {metric.score}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {metric.raw}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
