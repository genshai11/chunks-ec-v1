import { motion } from "framer-motion";

interface ScoreDisplayProps {
  score: number;
  emotionalFeedback: "excellent" | "good" | "poor";
  coinChange?: number | null;
}

const feedbackConfig = {
  excellent: {
    emoji: "🔥",
    en: "High Energy!",
    vi: "Năng lượng cao!",
    gradient: "from-emerald-400 via-cyan-400 to-blue-500",
    glow: "shadow-emerald-400/40",
  },
  good: {
    emoji: "⚡",
    en: "Good Energy",
    vi: "Năng lượng ổn",
    gradient: "from-cyan-400 via-blue-400 to-violet-500",
    glow: "shadow-cyan-400/40",
  },
  poor: {
    emoji: "💤",
    en: "Low Energy",
    vi: "Năng lượng thấp",
    gradient: "from-slate-400 via-zinc-400 to-gray-500",
    glow: "shadow-slate-400/30",
  },
};

export function ScoreDisplay({ score, emotionalFeedback, coinChange }: ScoreDisplayProps) {
  const config = feedbackConfig[emotionalFeedback];
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <motion.div className="flex flex-col items-center pt-4 pb-2" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="relative">
        <div className={`absolute inset-0 blur-3xl opacity-30 bg-gradient-to-br ${config.gradient} rounded-full scale-150`} />
        <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary/50" />
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            style={{ stroke: "url(#resultScoreGradient)", strokeDasharray: circumference }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="resultScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl mb-1">{config.emoji}</div>
          <span className={`text-5xl font-bold bg-gradient-to-br ${config.gradient} bg-clip-text text-transparent`}>{score}</span>
        </div>
      </div>

      <div className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r ${config.gradient} text-white font-semibold text-lg shadow-lg ${config.glow}`}>
        {config.en}
      </div>
      <p className="text-sm text-muted-foreground mt-2">{config.vi}</p>

      {coinChange !== null && coinChange !== undefined && (
        <div
          className={`mt-3 px-4 py-2 rounded-full text-sm font-semibold ${
            coinChange > 0
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
              : coinChange < 0
                ? "bg-rose-500/15 text-rose-300 border border-rose-400/30"
                : "bg-muted/40 text-muted-foreground border border-border/40"
          }`}
        >
          🪙 {coinChange > 0 ? "+" : coinChange < 0 ? "-" : "±"}{Math.abs(coinChange)}
        </div>
      )}
    </motion.div>
  );
}
