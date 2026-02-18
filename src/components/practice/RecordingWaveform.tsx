import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface RecordingWaveformProps {
  getAudioLevel: () => number;
  isActive: boolean;
}

export function RecordingWaveform({ getAudioLevel, isActive }: RecordingWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const historyRef = useRef<number[]>([]);
  const barCount = 48;

  useEffect(() => {
    if (!isActive || !canvasRef.current) {
      historyRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    const draw = () => {
      if (!isActive) return;

      const level = getAudioLevel();
      historyRef.current.push(level);
      if (historyRef.current.length > barCount) historyRef.current.shift();

      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;
      const centerY = height / 2;
      const barWidth = width / barCount;
      const gap = 3;

      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      for (let i = 0; i < historyRef.current.length; i++) {
        const x = i * barWidth;
        const amp = historyRef.current[i];
        const barHeight = Math.max(4, amp * height * 0.8);

        const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
        gradient.addColorStop(0, "rgba(34, 211, 238, 0.75)");
        gradient.addColorStop(0.5, "rgba(16, 185, 129, 0.9)");
        gradient.addColorStop(1, "rgba(34, 211, 238, 0.75)");

        ctx.shadowColor = "rgba(34, 211, 238, 0.6)";
        ctx.shadowBlur = 8 + amp * 16;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min((barWidth - gap) / 2, 4);
        ctx.roundRect(x + gap / 2, centerY - barHeight / 2, barWidth - gap, barHeight, radius);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [isActive, getAudioLevel]);

  if (!isActive) return null;

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-background/30 backdrop-blur-md rounded-2xl p-3 border border-white/10">
        <canvas ref={canvasRef} className="w-full h-20 rounded-xl" style={{ display: "block" }} />
      </div>
    </motion.div>
  );
}

