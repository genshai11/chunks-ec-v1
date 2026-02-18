import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronDown, ChevronUp, Volume2, Zap, TrendingUp, Clock, Waves, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreDisplay } from "@/components/practice/ScoreDisplay";
import { MetricCard } from "@/components/practice/MetricCard";
import type { AnalysisResult } from "@/lib/audioAnalysis";

interface ResultsViewProps {
  result: AnalysisResult;
  coinChange?: number | null;
  onRetry: () => void;
}

export function ResultsView({ result, coinChange, onRetry }: ResultsViewProps) {
  const [showDetails, setShowDetails] = useState(false);

  const metrics = useMemo(() => {
    const allMetrics = [
      {
        id: "volume",
        title: "Voice Power",
        titleVi: "Công suất giọng nói",
        score: result.volume.score,
        value: `Average: ${result.volume.averageDb.toFixed(1)} dB`,
        tag: "POWER",
        icon: Volume2,
      },
      {
        id: "speechRate",
        title: "Speech Tempo",
        titleVi: "Nhịp độ nói",
        score: result.speechRate.score,
        value: `${result.speechRate.wordsPerMinute} WPM`,
        tag: "TEMPO",
        icon: Zap,
      },
      {
        id: "acceleration",
        title: "Energy Boost",
        titleVi: "Tăng cường năng lượng",
        score: result.acceleration.score,
        value: result.acceleration.isAccelerating ? "Increasing momentum" : "Steady momentum",
        tag: "BOOST",
        icon: TrendingUp,
      },
      {
        id: "responseTime",
        title: "Response Spark",
        titleVi: "Phản ứng nhanh",
        score: result.responseTime.score,
        value: `Started in ${result.responseTime.responseTimeMs}ms`,
        tag: "SPARK",
        icon: Clock,
      },
      {
        id: "pauseManagement",
        title: "Flow Control",
        titleVi: "Kiểm soát nhịp",
        score: result.pauseManagement.score,
        value: `Pause ratio: ${(result.pauseManagement.pauseRatio * 100).toFixed(0)}%`,
        tag: "FLOW",
        icon: Waves,
      },
    ];

    try {
      const raw = localStorage.getItem("metricConfig");
      if (!raw) return allMetrics;
      const parsed = JSON.parse(raw) as Array<{ id?: string; enabled?: boolean; weight?: number }>;
      const enabled = new Set(parsed.filter((m) => m.id && m.enabled && Number(m.weight) > 0).map((m) => m.id as string));
      if (!enabled.size) return allMetrics;
      return allMetrics.filter((m) => enabled.has(m.id));
    } catch {
      return allMetrics;
    }
  }, [result]);

  const strongest = metrics.length ? metrics.reduce((a, b) => (a.score > b.score ? a : b)) : null;
  const focus = metrics.length ? metrics.reduce((a, b) => (a.score < b.score ? a : b)) : null;

  return (
    <div className="w-full max-w-md mx-auto px-2 pb-2">
      <ScoreDisplay score={result.overallScore} emotionalFeedback={result.emotionalFeedback} coinChange={coinChange} />

      {strongest && focus && strongest.id !== focus.id && (
        <motion.div
          className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Strongest</p>
              <p className="text-lg font-semibold">{strongest.title}</p>
              <p className="text-sm text-emerald-400">{strongest.score} pts</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Focus Area</p>
              <p className="text-lg font-semibold">{focus.title}</p>
              <p className="text-sm text-amber-400">{focus.score} pts</p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.button
        onClick={() => setShowDetails((v) => !v)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showDetails ? "Hide Detailed Breakdown" : "View Detailed Breakdown"}
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 mb-6 overflow-hidden pt-3"
          >
            {metrics.map((m, index) => (
              <MetricCard key={m.id} title={m.title} titleVi={m.titleVi} score={m.score} tag={m.tag} value={m.value} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={onRetry}
        size="lg"
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white"
      >
        <RotateCcw className="w-5 h-5 mr-2" />
        Practice Again
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}

