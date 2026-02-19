import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  isRecording: boolean;
  audioLevel?: number;
  className?: string;
}

export const AudioWaveform = ({ isRecording, audioLevel = 0, className }: AudioWaveformProps) => {
  const barsRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isRecording || !barsRef.current) {
      return;
    }

    const bars = barsRef.current.querySelectorAll('.waveform-bar');
    
    const animate = () => {
      bars.forEach((bar, i) => {
        const randomHeight = Math.random() * 60 + 20 + (audioLevel * 20);
        const delay = i * 50;
        
        setTimeout(() => {
          (bar as HTMLElement).style.height = `${Math.min(randomHeight, 100)}%`;
        }, delay);
      });

      animationRef.current = requestAnimationFrame(() => {
        setTimeout(animate, 100);
      });
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, audioLevel]);

  if (!isRecording) {
    return (
      <div className={cn("flex items-center justify-center h-16 gap-1", className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="w-1 h-2 bg-muted-foreground/30 rounded-full"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex items-center justify-center h-16 gap-1", className)}
      ref={barsRef}
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="waveform-bar w-1 rounded-full bg-gradient-to-t from-primary to-primary/50"
          initial={{ height: '20%' }}
          style={{ 
            transition: 'height 0.1s ease-out',
            minHeight: '8px'
          }}
        />
      ))}
    </motion.div>
  );
};
