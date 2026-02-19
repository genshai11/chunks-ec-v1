import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface AudioLevelMeterProps {
  audioLevel: number;
  lufs?: number | null;
  targetLUFS?: number;
  showWaveform?: boolean;
  height?: number;
}

export function AudioLevelMeter({
  audioLevel,
  lufs,
  targetLUFS = -23,
  showWaveform = false,
  height = 90,
}: AudioLevelMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    if (!showWaveform) return;
    setWaveformData((prev) => [...prev, audioLevel].slice(-100));
  }, [audioLevel, showWaveform]);

  useEffect(() => {
    if (!showWaveform || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, width, h);
    ctx.beginPath();
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.lineWidth = 2;
    waveformData.forEach((level, i) => {
      const x = (i / Math.max(1, waveformData.length)) * width;
      const y = h / 2 + (level - 0.5) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [waveformData, showWaveform]);

  const levelPercentage = Math.min(100, audioLevel * 100);
  const isActive = audioLevel > 0.01;
  const lufsColor =
    lufs == null ? "text-muted-foreground" : Math.abs(lufs - targetLUFS) < 2 ? "text-green-500" : Math.abs(lufs - targetLUFS) < 5 ? "text-yellow-500" : "text-orange-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{isActive ? <Volume2 className="w-5 h-5 text-primary animate-pulse" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}</div>
        <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500" style={{ width: `${levelPercentage}%` }} />
        </div>
        <div className="w-12 text-right text-sm font-medium">{Math.round(levelPercentage)}%</div>
      </div>

      {lufs != null && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <div className="text-xs text-muted-foreground">Current LUFS</div>
            <div className={`text-xl font-bold ${lufsColor}`}>{lufs.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Target</div>
            <div className="text-lg font-medium">{targetLUFS.toFixed(2)}</div>
          </div>
        </div>
      )}

      {showWaveform && (
        <canvas
          ref={canvasRef}
          width={400}
          height={height}
          className="w-full h-auto bg-muted rounded-lg"
        />
      )}
    </div>
  );
}

