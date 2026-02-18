import { motion } from "framer-motion";
import { Volume2, Mic2, Flame, Timer, Waves } from "lucide-react";
import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  titleVi: string;
  score: number;
  tag: string;
  value?: string;
  index: number;
}

const tagColors: Record<string, string> = {
  POWER: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  TEMPO: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  BOOST: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  SPARK: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  FLOW: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
};

const tagIcons: Record<string, ReactNode> = {
  POWER: <Volume2 className="w-4 h-4" />,
  TEMPO: <Mic2 className="w-4 h-4" />,
  BOOST: <Flame className="w-4 h-4" />,
  SPARK: <Timer className="w-4 h-4" />,
  FLOW: <Waves className="w-4 h-4" />,
};

const getScoreColor = (score: number) => {
  if (score >= 71) return "from-emerald-400 to-cyan-400";
  if (score >= 41) return "from-amber-400 to-emerald-400";
  return "from-rose-400 to-amber-400";
};

export const MetricCard = ({ title, titleVi, score, tag, value, index }: MetricCardProps) => (
  <motion.div
    className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
  >
    <div className="flex items-start justify-between mb-3">
      <div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${tagColors[tag] || ""}`}>
          {tagIcons[tag]}
          {tag}
        </span>
        <h4 className="text-sm font-semibold mt-2">{title}</h4>
        <p className="text-xs text-muted-foreground">{titleVi}</p>
      </div>
      <span className={`text-2xl font-bold bg-gradient-to-r ${getScoreColor(score)} bg-clip-text text-transparent`}>
        {score}
      </span>
    </div>
    <div className="h-2 rounded-full bg-secondary/60 overflow-hidden mb-2">
      <motion.div
        className={`h-full bg-gradient-to-r ${getScoreColor(score)}`}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ delay: 0.2 + index * 0.08, duration: 0.45 }}
      />
    </div>
    {value && <p className="text-xs text-muted-foreground">{value}</p>}
  </motion.div>
);
