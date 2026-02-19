import { useState, useEffect, useRef, useCallback } from "react";
import { calculateLUFS } from "@/lib/lufsNormalization";

export interface RealtimeAudioMetrics {
  audioLevel: number;
  lufs: number | null;
  isActive: boolean;
}

export function useRealtimeAudio(enabled: boolean = false) {
  const [metrics, setMetrics] = useState<RealtimeAudioMetrics>({ audioLevel: 0, lufs: null, isActive: false });
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array>(new Float32Array(0));
  const bufferIndexRef = useRef(0);
  const smoothedLevelRef = useRef(0);
  const lastLufsRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);

  const updateMetrics = useCallback(() => {
    if (!analyzerRef.current || !dataArrayRef.current) return;
    const analyzer = analyzerRef.current;
    const dataArray = dataArrayRef.current;
    analyzer.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
    const rms = Math.sqrt(sum / dataArray.length);
    const rawLevel = Math.min(1, rms * 5);
    smoothedLevelRef.current = smoothedLevelRef.current * 0.3 + rawLevel * 0.7;
    const audioLevel = smoothedLevelRef.current;

    const sampleRate = audioContextRef.current?.sampleRate || 48000;
    const required = Math.floor(sampleRate * 0.4);
    if (bufferRef.current.length !== required) {
      bufferRef.current = new Float32Array(required);
      bufferIndexRef.current = 0;
    }

    for (let i = 0; i < dataArray.length; i++) {
      bufferRef.current[bufferIndexRef.current] = dataArray[i];
      bufferIndexRef.current = (bufferIndexRef.current + 1) % required;
    }

    frameCountRef.current++;
    if (frameCountRef.current >= 6) {
      frameCountRef.current = 0;
      try {
        const computed = calculateLUFS(bufferRef.current, sampleRate);
        if (isFinite(computed)) lastLufsRef.current = computed;
      } catch {
        // ignore
      }
    }

    setMetrics({ audioLevel, lufs: lastLufsRef.current, isActive: audioLevel > 0.01 });
    animationFrameRef.current = requestAnimationFrame(updateMetrics);
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 2048;
      analyzer.smoothingTimeConstant = 0.8;
      analyzerRef.current = analyzer;

      dataArrayRef.current = new Float32Array(analyzer.fftSize);
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);

      updateMetrics();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access microphone");
    }
  }, [updateMetrics]);

  const stopMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    analyzerRef.current = null;
    dataArrayRef.current = null;
    bufferRef.current = new Float32Array(0);
    bufferIndexRef.current = 0;
    smoothedLevelRef.current = 0;
    lastLufsRef.current = null;
    frameCountRef.current = 0;
    setMetrics({ audioLevel: 0, lufs: null, isActive: false });
  }, []);

  useEffect(() => {
    if (enabled) startMonitoring();
    else stopMonitoring();
    return () => stopMonitoring();
  }, [enabled, startMonitoring, stopMonitoring]);

  return { ...metrics, error, startMonitoring, stopMonitoring };
}

