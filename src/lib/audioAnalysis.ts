// Audio Analysis Metrics for Voice Energy App
// Uses scoring_config table from Supabase admin panel

import { supabase } from "@/integrations/supabase/client";

// Types for speech rate method
export type SpeechRateMethod = "energy-peaks" | "deepgram-stt" | "zero-crossing-rate";

// Config interface matching Supabase scoring_config table
export interface ScoringConfigRow {
  id: string;
  metric_name: string;
  weight: number;
  min_value: number | null;
  max_value: number | null;
  description: string | null;
}

// Internal metric config for analysis functions
export interface MetricConfig {
  id: string;
  weight: number;
  thresholds: {
    min: number;
    ideal: number;
    max: number;
  };
  method?: SpeechRateMethod;
}

// Cache for scoring config from DB
let cachedConfig: MetricConfig[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

// Map DB metric names to internal metric IDs
const METRIC_NAME_MAP: Record<string, string> = {
  'volume': 'volume',
  'speech_rate': 'speechRate',
  'pauses': 'pauseManagement',
  'latency': 'responseTime',
  'end_intensity': 'acceleration', // Maps to our acceleration/dynamics metric
};

// Default config (fallback if DB fetch fails)
const DEFAULT_CONFIG: MetricConfig[] = [
  { id: "volume", weight: 20, thresholds: { min: -45, ideal: -20, max: 0 } },
  { id: "speechRate", weight: 25, thresholds: { min: 80, ideal: 150, max: 200 }, method: "energy-peaks" },
  { id: "acceleration", weight: 25, thresholds: { min: 0, ideal: 100, max: 100 } },
  { id: "responseTime", weight: 15, thresholds: { min: 500, ideal: 0, max: 3000 } },
  { id: "pauseManagement", weight: 15, thresholds: { min: 0, ideal: 0, max: 1.5 } },
];

// Fetch config from Supabase scoring_config table
async function fetchConfigFromDB(): Promise<MetricConfig[]> {
  try {
    const { data, error } = await supabase
      .from('scoring_config')
      .select('*');

    if (error) throw error;
    if (!data || data.length === 0) return DEFAULT_CONFIG;

    console.log('📊 Loaded scoring config from DB:', data);

    // Convert DB format to internal MetricConfig format
    const configMap = new Map<string, MetricConfig>();
    
    // Start with defaults
    DEFAULT_CONFIG.forEach(cfg => configMap.set(cfg.id, { ...cfg }));

    // Override with DB values
    data.forEach((row: ScoringConfigRow) => {
      const internalId = METRIC_NAME_MAP[row.metric_name];
      if (internalId && configMap.has(internalId)) {
        const existing = configMap.get(internalId)!;
        configMap.set(internalId, {
          ...existing,
          weight: row.weight * 100, // Convert from 0.20 to 20
          thresholds: {
            min: row.min_value ?? existing.thresholds.min,
            ideal: row.max_value ?? existing.thresholds.ideal, // max_value is the "good" target
            max: row.max_value ?? existing.thresholds.max,
          },
        });
      }
    });

    return Array.from(configMap.values());
  } catch (e) {
    console.error("Failed to fetch scoring config from DB:", e);
    return DEFAULT_CONFIG;
  }
}

// Sync version - uses cache only
function getConfig(): MetricConfig[] {
  return cachedConfig || DEFAULT_CONFIG;
}

// Async version - fetches fresh config if cache expired
async function getConfigAsync(): Promise<MetricConfig[]> {
  const now = Date.now();
  if (!cachedConfig || now - lastFetchTime > CACHE_DURATION) {
    cachedConfig = await fetchConfigFromDB();
    lastFetchTime = now;
  }
  return cachedConfig;
}

function getMetricConfig(id: string): MetricConfig | undefined {
  return getConfig().find((m) => m.id === id);
}

function getSpeechRateMethod(): SpeechRateMethod {
  const config = getMetricConfig("speechRate");
  return config?.method || "energy-peaks";
}

export interface VolumeResult {
  averageDb: number;
  score: number;
  tag: "ENERGY";
}

export interface SpeechRateResult {
  wordsPerMinute: number;
  syllablesPerSecond: number;
  score: number;
  tag: "FLUENCY";
  method: SpeechRateMethod;
  transcript?: string; // Only for STT method
}

export interface AccelerationResult {
  score: number;
  segment1Volume: number;
  segment2Volume: number;
  segment1Rate: number;
  segment2Rate: number;
  isAccelerating: boolean;
  tag: "DYNAMICS";
}

export interface ResponseTimeResult {
  responseTimeMs: number;
  score: number;
  tag: "READINESS";
}

export interface PauseManagementResult {
  pauseCount: number;
  avgPauseDuration: number;
  maxPauseDuration: number;
  score: number;
  tag: "FLUIDITY";
}

export interface AnalysisResult {
  volume: VolumeResult;
  speechRate: SpeechRateResult;
  acceleration: AccelerationResult;
  responseTime: ResponseTimeResult;
  pauseManagement: PauseManagementResult;
  overallScore: number;
  emotionalFeedback: "excellent" | "good" | "poor";
  // UI-friendly metrics for display
  metrics: {
    volume: number;
    speechRate: number;
    pauses: number;
    latency: number;
    endIntensity: number;
  };
  // Actionable feedback based on analysis
  feedback: string[];
}

// Calculate RMS in dB for a buffer segment
function calculateSegmentDb(buffer: Float32Array): number {
  const rms = Math.sqrt(buffer.reduce((sum, sample) => sum + sample * sample, 0) / buffer.length);
  return 20 * Math.log10(Math.max(rms, 0.00001));
}

// Volume Level Analysis - uses configured thresholds
export function calculateVolumeLevel(audioBuffer: Float32Array): VolumeResult {
  const config = getMetricConfig("volume");
  const MIN_DB = config?.thresholds.min ?? -40;
  const TARGET_DB = config?.thresholds.ideal ?? -10;

  const averageDb = calculateSegmentDb(audioBuffer);

  let score: number;
  if (averageDb < MIN_DB) {
    score = 0;
  } else if (averageDb >= TARGET_DB) {
    score = 100;
  } else {
    score = ((averageDb - MIN_DB) / (TARGET_DB - MIN_DB)) * 100;
  }

  return {
    averageDb,
    score: Math.round(Math.max(0, Math.min(100, score))),
    tag: "ENERGY",
  };
}

// Speech Rate Analysis - Volume-compensated peak detection
function detectEnergyPeaks(audioBuffer: Float32Array, sampleRate: number, volumeDb: number): number[] {
  const windowSize = Math.floor(0.02 * sampleRate);
  const minPeakDistance = Math.floor((0.1 * sampleRate) / windowSize);

  // VOLUME COMPENSATION
  let threshold: number;
  if (volumeDb >= -10) {
    threshold = -30;
  } else if (volumeDb >= -40) {
    const volumeRange = -10 - -40;
    const volumePosition = (volumeDb - -40) / volumeRange;
    threshold = volumeDb + 5 + volumePosition * (-30 - (volumeDb + 5));
  } else {
    threshold = volumeDb + 5;
  }

  const windows: number[] = [];

  for (let i = 0; i < audioBuffer.length - windowSize; i += windowSize) {
    const window = audioBuffer.slice(i, i + windowSize);
    const rms = Math.sqrt(window.reduce((sum, sample) => sum + sample * sample, 0) / window.length);
    const db = 20 * Math.log10(Math.max(rms, 0.00001));
    windows.push(db);
  }

  const peaks: number[] = [];
  let lastPeakIndex = -minPeakDistance;

  for (let i = 1; i < windows.length - 1; i++) {
    if (
      i - lastPeakIndex >= minPeakDistance &&
      windows[i] > threshold &&
      windows[i] > windows[i - 1] &&
      windows[i] > windows[i + 1]
    ) {
      peaks.push(i);
      lastPeakIndex = i;
    }
  }

  return peaks;
}

export function calculateSpeechRate(
  audioBuffer: Float32Array,
  sampleRate: number,
  duration: number,
  volumeDb?: number,
): SpeechRateResult {
  const config = getMetricConfig("speechRate");
  const MIN_WPM = config?.thresholds.min ?? 80;
  const IDEAL_WPM = config?.thresholds.ideal ?? 160;

  const actualVolumeDb = volumeDb ?? calculateSegmentDb(audioBuffer);

  const peaks = detectEnergyPeaks(audioBuffer, sampleRate, actualVolumeDb);
  const syllablesPerSecond = peaks.length / Math.max(duration, 0.1);
  const wordsPerMinute = syllablesPerSecond * 60 * 0.6;

  let score: number;
  if (wordsPerMinute >= IDEAL_WPM) {
    score = 100;
  } else if (wordsPerMinute < MIN_WPM) {
    score = Math.max(0, (wordsPerMinute / MIN_WPM) * 50);
  } else {
    score = 50 + ((wordsPerMinute - MIN_WPM) / (IDEAL_WPM - MIN_WPM)) * 50;
  }

  return {
    wordsPerMinute: Math.round(wordsPerMinute),
    syllablesPerSecond: Math.round(syllablesPerSecond * 10) / 10,
    score: Math.round(Math.max(0, Math.min(100, score))),
    tag: "FLUENCY",
    method: "energy-peaks",
  };
}

// Zero-Crossing Rate (ZCR) based Speech Rate Detection
function detectSyllablesWithZCR(audioBuffer: Float32Array, sampleRate: number): number[] {
  const frameSize = Math.floor(0.025 * sampleRate);
  const hopSize = Math.floor(0.010 * sampleRate);
  const minPeakDistance = Math.floor(0.08 * sampleRate / hopSize);

  const frames: { zcr: number; energy: number }[] = [];

  for (let i = 0; i < audioBuffer.length - frameSize; i += hopSize) {
    const frame = audioBuffer.slice(i, i + frameSize);

    let zeroCrossings = 0;
    for (let j = 1; j < frame.length; j++) {
      if ((frame[j] >= 0 && frame[j - 1] < 0) || (frame[j] < 0 && frame[j - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / frame.length;

    const energy = Math.sqrt(frame.reduce((sum, s) => sum + s * s, 0) / frame.length);

    frames.push({ zcr, energy });
  }

  if (frames.length === 0) return [];

  const maxEnergy = Math.max(...frames.map(f => f.energy));
  const energyThreshold = maxEnergy * 0.1;

  const syllableFrames: number[] = [];
  let inSyllable = false;
  let syllableStart = 0;

  for (let i = 0; i < frames.length; i++) {
    const { zcr, energy } = frames[i];
    const isVoiced = energy > energyThreshold && zcr > 0.02 && zcr < 0.35;

    if (isVoiced && !inSyllable) {
      inSyllable = true;
      syllableStart = i;
    } else if (!isVoiced && inSyllable) {
      inSyllable = false;
      const syllableMid = Math.floor((syllableStart + i) / 2);

      if (syllableFrames.length === 0 || syllableMid - syllableFrames[syllableFrames.length - 1] >= minPeakDistance) {
        syllableFrames.push(syllableMid);
      }
    }
  }

  return syllableFrames;
}

export function calculateSpeechRateWithZCR(
  audioBuffer: Float32Array,
  sampleRate: number,
  duration: number
): SpeechRateResult {
  const config = getMetricConfig("speechRate");
  const MIN_WPM = config?.thresholds.min ?? 80;
  const IDEAL_WPM = config?.thresholds.ideal ?? 160;

  const syllables = detectSyllablesWithZCR(audioBuffer, sampleRate);
  const syllablesPerSecond = syllables.length / Math.max(duration, 0.1);
  const wordsPerMinute = syllablesPerSecond * 60 / 1.5;

  let score: number;
  if (wordsPerMinute >= IDEAL_WPM) {
    score = 100;
  } else if (wordsPerMinute < MIN_WPM) {
    score = Math.max(0, (wordsPerMinute / MIN_WPM) * 50);
  } else {
    score = 50 + ((wordsPerMinute - MIN_WPM) / (IDEAL_WPM - MIN_WPM)) * 50;
  }

  return {
    wordsPerMinute: Math.round(wordsPerMinute),
    syllablesPerSecond: Math.round(syllablesPerSecond * 10) / 10,
    score: Math.round(Math.max(0, Math.min(100, score))),
    tag: "FLUENCY",
    method: "zero-crossing-rate",
  };
}

// Speech Rate via Deepgram STT
export async function calculateSpeechRateWithSTT(audioBase64: string, duration: number): Promise<SpeechRateResult> {
  const config = getMetricConfig("speechRate");
  const MIN_WPM = config?.thresholds.min ?? 80;
  const IDEAL_WPM = config?.thresholds.ideal ?? 160;

  try {
    const { data, error } = await supabase.functions.invoke("deepgram-transcribe", {
      body: { audio: audioBase64 },
    });

    if (error) throw error;

    const wordsPerMinute = data.wordsPerMinute || 0;
    const transcript = data.transcript || "";

    let score: number;
    if (wordsPerMinute >= IDEAL_WPM) {
      score = 100;
    } else if (wordsPerMinute < MIN_WPM) {
      score = Math.max(0, (wordsPerMinute / MIN_WPM) * 50);
    } else {
      score = 50 + ((wordsPerMinute - MIN_WPM) / (IDEAL_WPM - MIN_WPM)) * 50;
    }

    return {
      wordsPerMinute,
      syllablesPerSecond: wordsPerMinute / 60 / 0.6,
      score: Math.round(Math.max(0, Math.min(100, score))),
      tag: "FLUENCY",
      method: "deepgram-stt",
      transcript,
    };
  } catch (error) {
    console.error("Deepgram STT error, falling back to energy peaks:", error);
    return {
      wordsPerMinute: 0,
      syllablesPerSecond: 0,
      score: 0,
      tag: "FLUENCY",
      method: "deepgram-stt",
      transcript: "Error: Could not transcribe audio",
    };
  }
}

// Acceleration Analysis
export function calculateAcceleration(audioBuffer: Float32Array, sampleRate: number): AccelerationResult {
  const volumeConfig = getMetricConfig("volume");
  const speechConfig = getMetricConfig("speechRate");

  const targetVolumeDb = volumeConfig?.thresholds.ideal ?? -10;
  const targetSpeechRate = speechConfig?.thresholds.ideal ?? 160;

  const midPoint = Math.floor(audioBuffer.length / 2);
  const segment1 = audioBuffer.slice(0, midPoint);
  const segment2 = audioBuffer.slice(midPoint);

  if (segment1.length < sampleRate * 0.5 || segment2.length < sampleRate * 0.5) {
    return {
      score: 50,
      segment1Volume: 0,
      segment2Volume: 0,
      segment1Rate: 0,
      segment2Rate: 0,
      isAccelerating: false,
      tag: "DYNAMICS",
    };
  }

  const segment1Volume = calculateSegmentDb(segment1);
  const segment2Volume = calculateSegmentDb(segment2);

  const segment1Rate = calculateSpeechRate(
    segment1,
    sampleRate,
    segment1.length / sampleRate,
    segment1Volume,
  ).wordsPerMinute;

  const segment2Rate = calculateSpeechRate(
    segment2,
    sampleRate,
    segment2.length / sampleRate,
    segment2Volume,
  ).wordsPerMinute;

  const volumeIncreased = segment2Volume > segment1Volume;
  const rateIncreased = segment2Rate > segment1Rate;

  const volumeAboveTarget = segment2Volume >= targetVolumeDb;
  const rateAboveTarget = segment2Rate >= targetSpeechRate;

  let score = 0;
  const isAccelerating = volumeIncreased && rateIncreased;

  if (isAccelerating) {
    score = 50;

    if (volumeAboveTarget) {
      score += 25;
    } else {
      const volumeProgress = Math.max(0, (segment2Volume - -40) / (targetVolumeDb - -40));
      score += Math.round(volumeProgress * 25);
    }

    if (rateAboveTarget) {
      score += 25;
    } else {
      const rateProgress = Math.max(0, segment2Rate / targetSpeechRate);
      score += Math.round(Math.min(1, rateProgress) * 25);
    }
  } else {
    if (volumeIncreased || rateIncreased) {
      score = 30;
    } else {
      score = 10;
    }
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    segment1Volume: Math.round(segment1Volume * 10) / 10,
    segment2Volume: Math.round(segment2Volume * 10) / 10,
    segment1Rate,
    segment2Rate,
    isAccelerating,
    tag: "DYNAMICS",
  };
}

// Response Time Analysis
export function calculateResponseTime(audioBuffer: Float32Array, sampleRate: number): ResponseTimeResult {
  const config = getMetricConfig("responseTime");
  const INSTANT = config?.thresholds.ideal ?? 200;
  const POOR = config?.thresholds.min ?? 2000;

  const SILENCE_THRESHOLD = -45;
  const MIN_SPEECH_DURATION = 0.2;
  const minSpeechSamples = Math.floor(MIN_SPEECH_DURATION * sampleRate);

  let firstSpeechTime = audioBuffer.length / sampleRate;

  for (let t = 0; t < audioBuffer.length - minSpeechSamples; t += Math.floor(sampleRate * 0.05)) {
    const window = audioBuffer.slice(t, t + minSpeechSamples);
    const rms = Math.sqrt(window.reduce((sum, sample) => sum + sample * sample, 0) / window.length);
    const db = 20 * Math.log10(Math.max(rms, 0.00001));

    if (db > SILENCE_THRESHOLD) {
      firstSpeechTime = t / sampleRate;
      break;
    }
  }

  const responseTimeMs = firstSpeechTime * 1000;

  let score: number;
  if (responseTimeMs <= INSTANT) {
    score = 100;
  } else if (responseTimeMs >= POOR) {
    score = 0;
  } else {
    score = 100 - ((responseTimeMs - INSTANT) / (POOR - INSTANT)) * 100;
  }

  return {
    responseTimeMs: Math.round(responseTimeMs),
    score: Math.round(Math.max(0, Math.min(100, score))),
    tag: "READINESS",
  };
}

// Pause Management Analysis
interface Pause {
  start: number;
  duration: number;
}

function detectPauses(audioBuffer: Float32Array, sampleRate: number): Pause[] {
  const SILENCE_THRESHOLD = -45;
  const MIN_PAUSE_DURATION = 0.15;
  const windowSize = Math.floor(0.05 * sampleRate);

  const pauses: Pause[] = [];
  let inPause = false;
  let pauseStart = 0;
  let speechStarted = false;

  for (let i = 0; i < audioBuffer.length - windowSize; i += windowSize) {
    const window = audioBuffer.slice(i, i + windowSize);
    const rms = Math.sqrt(window.reduce((sum, sample) => sum + sample * sample, 0) / window.length);
    const db = 20 * Math.log10(Math.max(rms, 0.00001));

    const isSilent = db < SILENCE_THRESHOLD;

    if (!isSilent && !speechStarted) {
      speechStarted = true;
    }

    if (speechStarted) {
      if (isSilent && !inPause) {
        inPause = true;
        pauseStart = i / sampleRate;
      } else if (!isSilent && inPause) {
        inPause = false;
        const duration = i / sampleRate - pauseStart;
        if (duration >= MIN_PAUSE_DURATION) {
          pauses.push({ start: pauseStart, duration });
        }
      }
    }
  }

  return pauses;
}

export function calculatePauseManagement(
  audioBuffer: Float32Array,
  sampleRate: number,
  duration: number,
): PauseManagementResult {
  const config = getMetricConfig("pauseManagement");
  const MAX_PAUSE_DURATION = config?.thresholds.max ?? 2.71;
  const MAX_PAUSE_COUNT = config?.thresholds.min ?? 3;

  const pauses = detectPauses(audioBuffer, sampleRate);

  if (pauses.length === 0) {
    return {
      pauseCount: 0,
      avgPauseDuration: 0,
      maxPauseDuration: 0,
      score: 100,
      tag: "FLUIDITY",
    };
  }

  const maxPauseDuration = Math.max(...pauses.map((p) => p.duration));
  const avgDuration = pauses.reduce((sum, p) => sum + p.duration, 0) / pauses.length;

  if (maxPauseDuration > MAX_PAUSE_DURATION) {
    return {
      pauseCount: pauses.length,
      avgPauseDuration: Math.round(avgDuration * 100) / 100,
      maxPauseDuration: Math.round(maxPauseDuration * 100) / 100,
      score: 0,
      tag: "FLUIDITY",
    };
  }

  if (pauses.length > MAX_PAUSE_COUNT) {
    return {
      pauseCount: pauses.length,
      avgPauseDuration: Math.round(avgDuration * 100) / 100,
      maxPauseDuration: Math.round(maxPauseDuration * 100) / 100,
      score: 0,
      tag: "FLUIDITY",
    };
  }

  let score = 100;

  const pauseCountPenalty = (pauses.length / MAX_PAUSE_COUNT) * 30;
  score -= pauseCountPenalty;

  const maxPauseRatio = maxPauseDuration / MAX_PAUSE_DURATION;
  score -= Math.round(maxPauseRatio * 40);

  const warningPauses = pauses.filter((p) => p.duration > MAX_PAUSE_DURATION * 0.5);
  score -= warningPauses.length * 10;

  return {
    pauseCount: pauses.length,
    avgPauseDuration: Math.round(avgDuration * 100) / 100,
    maxPauseDuration: Math.round(maxPauseDuration * 100) / 100,
    score: Math.round(Math.max(0, Math.min(100, score))),
    tag: "FLUIDITY",
  };
}

// Main Analysis Function - uses configured weights (sync version for energy peaks)
export function analyzeAudio(audioBuffer: Float32Array, sampleRate: number): AnalysisResult {
  const duration = audioBuffer.length / sampleRate;
  const config = getConfig();

  const volume = calculateVolumeLevel(audioBuffer);
  const speechRate = calculateSpeechRate(audioBuffer, sampleRate, duration, volume.averageDb);
  const acceleration = calculateAcceleration(audioBuffer, sampleRate);
  const responseTime = calculateResponseTime(audioBuffer, sampleRate);
  const pauseManagement = calculatePauseManagement(audioBuffer, sampleRate, duration);

  const volumeWeight = (config.find((m) => m.id === "volume")?.weight ?? 30) / 100;
  const speechWeight = (config.find((m) => m.id === "speechRate")?.weight ?? 30) / 100;
  const accelerationWeight = (config.find((m) => m.id === "acceleration")?.weight ?? 15) / 100;
  const responseWeight = (config.find((m) => m.id === "responseTime")?.weight ?? 10) / 100;
  const pauseWeight = (config.find((m) => m.id === "pauseManagement")?.weight ?? 15) / 100;

  const overallScore = Math.min(
    100,
    Math.round(
      volume.score * volumeWeight +
      speechRate.score * speechWeight +
      acceleration.score * accelerationWeight +
      responseTime.score * responseWeight +
      pauseManagement.score * pauseWeight,
    ),
  );

  let emotionalFeedback: "excellent" | "good" | "poor";
  if (overallScore >= 71) {
    emotionalFeedback = "excellent";
  } else if (overallScore >= 41) {
    emotionalFeedback = "good";
  } else {
    emotionalFeedback = "poor";
  }

  // Generate UI-friendly metrics
  const metrics = {
    volume: volume.score,
    speechRate: speechRate.score,
    pauses: pauseManagement.score,
    latency: responseTime.score,
    endIntensity: acceleration.score,
  };

  // Generate contextual feedback
  const feedback: string[] = [];

  if (volume.score < 60) {
    if (volume.averageDb < -30) {
      feedback.push("Speak louder and closer to the microphone for better clarity.");
    } else if (volume.averageDb > -10) {
      feedback.push("Your volume is good, but try to maintain consistent energy.");
    }
  }

  if (speechRate.score < 60) {
    if (speechRate.wordsPerMinute < 100) {
      feedback.push("Try to speak a bit faster to sound more natural and fluent.");
    } else if (speechRate.wordsPerMinute > 200) {
      feedback.push("Slow down slightly - speaking too fast can reduce clarity.");
    }
  }

  if (pauseManagement.score < 60) {
    if (pauseManagement.pauseCount > 3) {
      feedback.push("Try to reduce pauses for smoother, more fluent speech.");
    } else if (pauseManagement.maxPauseDuration > 2) {
      feedback.push("Keep pauses shorter to maintain speech flow and engagement.");
    }
  }

  if (responseTime.score < 60) {
    feedback.push("Start speaking sooner after the prompt for better responsiveness.");
  }

  if (acceleration.score < 60 && acceleration.isAccelerating === false) {
    feedback.push("Try to build energy as you speak - start steady and finish strong.");
  }

  if (feedback.length === 0) {
    if (overallScore >= 90) {
      feedback.push("Excellent work! Your pronunciation and delivery are outstanding.");
    } else if (overallScore >= 70) {
      feedback.push("Great job! Keep practicing to maintain this level of performance.");
    } else {
      feedback.push("Good effort! Keep practicing to improve your scores.");
    }
  }

  return {
    volume,
    speechRate,
    acceleration,
    responseTime,
    pauseManagement,
    overallScore,
    emotionalFeedback,
    metrics,
    feedback,
  };
}

// Async Analysis Function - fetches fresh config from DB and supports STT
export async function analyzeAudioAsync(
  audioBuffer: Float32Array,
  sampleRate: number,
  audioBase64?: string,
): Promise<AnalysisResult> {
  const duration = audioBuffer.length / sampleRate;
  
  // Fetch fresh config from Supabase scoring_config table
  const config = await getConfigAsync();
  console.log('🎯 Using scoring config:', config.map(c => `${c.id}: ${c.weight}%`).join(', '));
  
  const method = getSpeechRateMethod();

  const volume = calculateVolumeLevel(audioBuffer);

  let speechRate: SpeechRateResult;
  if (method === "deepgram-stt" && audioBase64) {
    speechRate = await calculateSpeechRateWithSTT(audioBase64, duration);
  } else if (method === "zero-crossing-rate") {
    speechRate = calculateSpeechRateWithZCR(audioBuffer, sampleRate, duration);
  } else {
    speechRate = calculateSpeechRate(audioBuffer, sampleRate, duration, volume.averageDb);
  }

  const acceleration = calculateAcceleration(audioBuffer, sampleRate);
  const responseTime = calculateResponseTime(audioBuffer, sampleRate);
  const pauseManagement = calculatePauseManagement(audioBuffer, sampleRate, duration);

  // Use weights from DB config (already in percentage form like 20, 25, etc.)
  const volumeWeight = (config.find((m) => m.id === "volume")?.weight ?? 20) / 100;
  const speechWeight = (config.find((m) => m.id === "speechRate")?.weight ?? 25) / 100;
  const accelerationWeight = (config.find((m) => m.id === "acceleration")?.weight ?? 25) / 100;
  const responseWeight = (config.find((m) => m.id === "responseTime")?.weight ?? 15) / 100;
  const pauseWeight = (config.find((m) => m.id === "pauseManagement")?.weight ?? 15) / 100;

  console.log('📈 Applying weights:', { volumeWeight, speechWeight, accelerationWeight, responseWeight, pauseWeight });

  const overallScore = Math.min(
    100,
    Math.round(
      volume.score * volumeWeight +
      speechRate.score * speechWeight +
      acceleration.score * accelerationWeight +
      responseTime.score * responseWeight +
      pauseManagement.score * pauseWeight,
    ),
  );

  let emotionalFeedback: "excellent" | "good" | "poor";
  if (overallScore >= 71) {
    emotionalFeedback = "excellent";
  } else if (overallScore >= 41) {
    emotionalFeedback = "good";
  } else {
    emotionalFeedback = "poor";
  }

  // Generate UI-friendly metrics
  const metrics = {
    volume: volume.score,
    speechRate: speechRate.score,
    pauses: pauseManagement.score,
    latency: responseTime.score,
    endIntensity: acceleration.score,
  };

  // Generate contextual feedback
  const feedback: string[] = [];

  if (volume.score < 60) {
    if (volume.averageDb < -30) {
      feedback.push("Speak louder and closer to the microphone for better clarity.");
    } else if (volume.averageDb > -10) {
      feedback.push("Your volume is good, but try to maintain consistent energy.");
    }
  }

  if (speechRate.score < 60) {
    if (speechRate.wordsPerMinute < 100) {
      feedback.push("Try to speak a bit faster to sound more natural and fluent.");
    } else if (speechRate.wordsPerMinute > 200) {
      feedback.push("Slow down slightly - speaking too fast can reduce clarity.");
    }
  }

  if (pauseManagement.score < 60) {
    if (pauseManagement.pauseCount > 3) {
      feedback.push("Try to reduce pauses for smoother, more fluent speech.");
    } else if (pauseManagement.maxPauseDuration > 2) {
      feedback.push("Keep pauses shorter to maintain speech flow and engagement.");
    }
  }

  if (responseTime.score < 60) {
    feedback.push("Start speaking sooner after the prompt for better responsiveness.");
  }

  if (acceleration.score < 60 && acceleration.isAccelerating === false) {
    feedback.push("Try to build energy as you speak - start steady and finish strong.");
  }

  if (feedback.length === 0) {
    if (overallScore >= 90) {
      feedback.push("Excellent work! Your pronunciation and delivery are outstanding.");
    } else if (overallScore >= 70) {
      feedback.push("Great job! Keep practicing to maintain this level of performance.");
    } else {
      feedback.push("Good effort! Keep practicing to improve your scores.");
    }
  }

  return {
    volume,
    speechRate,
    acceleration,
    responseTime,
    pauseManagement,
    overallScore,
    emotionalFeedback,
    metrics,
    feedback,
  };
}
