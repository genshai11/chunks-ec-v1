import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface FloatingEnergyIndicatorProps {
  audioLevel: number;
  isActive: boolean;
}

export function FloatingEnergyIndicator({ audioLevel, isActive }: FloatingEnergyIndicatorProps) {
  const level = Math.min(Math.max(audioLevel, 0), 1);

  const state =
    level < 0.2
      ? { emoji: "😴", label: "Quiet", color: "text-cyan-300" }
      : level < 0.45
        ? { emoji: "🙂", label: "Warm", color: "text-emerald-300" }
        : level < 0.7
          ? { emoji: "🔥", label: "Great", color: "text-yellow-300" }
          : { emoji: "⚡", label: "Power", color: "text-amber-300" };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none"
          initial={{ opacity: 0, y: 10, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.7 }}
        >
          <motion.div
            className="text-4xl"
            animate={{ scale: [1, 1.08 + level * 0.18, 1] }}
            transition={{ duration: 0.45, repeat: Infinity }}
          >
            {state.emoji}
          </motion.div>
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-black/45 ${state.color}`}>
            <Zap className="w-3 h-3" />
            {state.label}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

