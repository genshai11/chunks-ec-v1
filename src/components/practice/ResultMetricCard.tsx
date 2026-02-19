import { motion } from "framer-motion";
import { Volume2, Mic2, Flame, Timer, Waves } from "lucide-react";

interface ResultMetricCardProps {
  title: string;
  subtitle: string;
  score: number;
  tag: "POWER" | "TEMPO" | "BOOST" | "SPARK" | "FLOW";
  value?: string;
  index: number;
}

const tagIcon = {
  POWER: Volume2,
  TEMPO: Mic2,
  BOOST: Flame,
  SPARK: Timer,
  FLOW: Waves,
};

const getScoreClass = (score: number) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
};

export function ResultMetricCard({ title, subtitle, score, tag, value, index }: ResultMetricCardProps) {
  const Icon = tagIcon[tag];
  return (
    <motion.div
      className="rounded-xl border border-border/60 bg-card/60 p-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{tag}</div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <Icon className={`w-4 h-4 ${getScoreClass(score)}`} />
      </div>
      <div className="mt-3">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className={`h-full ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className={`text-sm font-bold ${getScoreClass(score)}`}>{score}</span>
          {value && <span className="text-xs text-muted-foreground">{value}</span>}
        </div>
      </div>
    </motion.div>
  );
}

