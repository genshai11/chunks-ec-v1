import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingEnergyIndicator } from "@/components/practice/FloatingEnergyIndicator";

interface PracticeCameraFeedProps {
  isRecording?: boolean;
  audioLevel?: number;
  className?: string;
  onTap?: () => void;
  hintText?: string;
}

export function PracticeCameraFeed({
  isRecording = false,
  audioLevel = 0,
  className,
  onTap,
  hintText,
}: PracticeCameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsActive(true);
        setIsLoading(false);
      } catch (err) {
        if (!mounted) return;
        let message = "Camera is unavailable";
        if (err instanceof Error && err.name === "NotAllowedError") {
          message = "Please allow camera access";
        }
        setError(message);
        setIsLoading(false);
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const glowIntensity = isRecording ? Math.min(audioLevel, 1) : 0;

  return (
    <div
      className={cn("relative w-full aspect-video overflow-hidden rounded-2xl bg-card border border-border/50", className)}
      onClick={onTap}
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-0"
        )}
        style={{ transform: "scaleX(-1)" }}
      />

      {!isLoading && !error && (
        <>
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-primary/40 rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-primary/40 rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-primary/40 rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-primary/40 rounded-br-lg" />
        </>
      )}

      {isRecording && isActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 ${30 + glowIntensity * 60}px rgba(34, 211, 238, ${0.15 + glowIntensity * 0.35})`,
          }}
          animate={{
            boxShadow: [
              `inset 0 0 ${30 + glowIntensity * 60}px rgba(34, 211, 238, ${0.15 + glowIntensity * 0.35})`,
              `inset 0 0 ${50 + glowIntensity * 80}px rgba(34, 211, 238, ${0.25 + glowIntensity * 0.45})`,
              `inset 0 0 ${30 + glowIntensity * 60}px rgba(34, 211, 238, ${0.15 + glowIntensity * 0.35})`,
            ],
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}

      <FloatingEnergyIndicator audioLevel={audioLevel} isActive={isRecording && isActive} />

      {hintText && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-black/45 text-white text-sm px-4 py-2 rounded-full">{hintText}</span>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Camera className="h-8 w-8 animate-pulse text-primary" />
            <p className="text-xs">Starting camera...</p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="flex flex-col items-center gap-2 text-center px-6">
            <VideoOff className="h-8 w-8 text-destructive" />
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
