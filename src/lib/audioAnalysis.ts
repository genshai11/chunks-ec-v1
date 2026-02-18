import { supabase } from "@/integrations/supabase/client";
import { calibrateAndNormalize, getCalibrationProfile, TARGET_LUFS } from "./lufsNormalization";

export interface SpeechSegment {
  start: number;
  end: number;
  duration: number;
}

export interface VADMetrics {
  speechSegments: SpeechSegment[];
  totalSpeechTime: number;
  totalSilenceTime: number;
  speechRatio: number;
  isSpeaking: boolean;
  speechProbability: number;
}

export type SpeechRateMethod = "energy-peaks" | "vad-enhanced" | "spectral-flux" | "deepgram-stt" | "zero-crossing-rate";

export interface MetricConfig {
  id: string;
  weight: number;
  thresholds: { min: number; ideal: number; max: number };
  method?: SpeechRateMethod;
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
  transcript?: string;
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
  pauseRatio: number;
  score: number;
  tag: "FLUIDITY";
}

export interface AnalysisResult {
  volume: VolumeResult;
  speechRate: SpeechRateResult;
  acceleration: AccelerationResult;
  responseTime: ResponseTimeResult;
  pauseManagement: PauseManagementResult;
  pauses: PauseManagementResult;
  overallScore: number;
  emotionalFeedback: "excellent" | "good" | "poor";
  metrics: {
    volume: number;
    speechRate: number;
    pauses: number;
    latency: number;
    endIntensity: number;
  };
  normalization?: {
    originalLUFS: number;
    calibratedLUFS: number;
    finalLUFS: number;
    deviceGain: number;
    normalizationGain: number;
  };
  feedback: string[];
}

const DEFAULT_CONFIG: MetricConfig[] = [
  { id: "volume", weight: 40, thresholds: { min: -35, ideal: -15, max: 0 } },
  { id: "speechRate", weight: 40, thresholds: { min: 90, ideal: 150, max: 220 }, method: "spectral-flux" },
  { id: "acceleration", weight: 5, thresholds: { min: 0, ideal: 50, max: 100 } },
  { id: "responseTime", weight: 5, thresholds: { min: 2000, ideal: 200, max: 0 } },
  { id: "pauseManagement", weight: 10, thresholds: { min: 0, ideal: 0, max: 2.71 } },
];

const DB_METRIC_MAP: Record<string, string> = {
  volume: "volume",
  speech_rate: "speechRate",
  end_intensity: "acceleration",
  latency: "responseTime",
  pauses: "pauseManagement",
};

let cachedConfig: MetricConfig[] | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

function getMetricConfig(config: MetricConfig[], id: string): MetricConfig | undefined {
  return config.find((m) => m.id === id);
}

function getConfigFromLocalStorage(): MetricConfig[] | null {
  try {
    const raw = localStorage.getItem("metricConfig");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      weight?: number;
      enabled?: boolean;
      thresholds?: { min?: number; ideal?: number; max?: number };
      method?: string;
    }>;

    const mapped = parsed
      .filter((m) => m.id && m.enabled && Number(m.weight) > 0)
      .map((m) => {
        const fallback = DEFAULT_CONFIG.find((d) => d.id === m.id);
        return {
          id: m.id as string,
          weight: Number(m.weight ?? 0),
          thresholds: {
            min: Number(m.thresholds?.min ?? fallback?.thresholds.min ?? 0),
            ideal: Number(m.thresholds?.ideal ?? fallback?.thresholds.ideal ?? 0),
            max: Number(m.thresholds?.max ?? fallback?.thresholds.max ?? 0),
          },
          method: (m.method as SpeechRateMethod | undefined) ?? fallback?.method,
        } satisfies MetricConfig;
      });

    return mapped.length ? mapped : null;
  } catch {
    return null;
  }
}

async function fetchConfigFromDB(): Promise<MetricConfig[]> {
  try {
    const { data, error } = await supabase.from("scoring_config").select("*");
    if (error || !data?.length) return DEFAULT_CONFIG;

    const base = new Map(DEFAULT_CONFIG.map((m) => [m.id, { ...m }]));
    for (const row of data) {
      const id = DB_METRIC_MAP[row.metric_name];
      if (!id || !base.has(id)) continue;
      const prev = base.get(id)!;
      base.set(id, {
        ...prev,
        weight: Math.round(Number(row.weight) * 100),
        thresholds: {
          min: Number(row.min_value ?? prev.thresholds.min),
          ideal: Number(row.max_value ?? prev.thresholds.ideal),
          max: id === "pauseManagement" ? Number(row.max_value ?? prev.thresholds.max) : prev.thresholds.max,
        },
      });
    }

    return Array.from(base.values());
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function getConfigAsync(): Promise<MetricConfig[]> {
  const local = getConfigFromLocalStorage();
  if (local) return local;

  const now = Date.now();
  if (!cachedConfig || now - cachedAt > CACHE_MS) {
    cachedConfig = await fetchConfigFromDB();
    cachedAt = now;
  }
  return cachedConfig;
}

function getSpeechRateMethod(config: MetricConfig[]): SpeechRateMethod {
  const localMethod = localStorage.getItem("speechRateMethod") as SpeechRateMethod | null;
  if (localMethod) return localMethod;
  return (getMetricConfig(config, "speechRate")?.method as SpeechRateMethod | undefined) ?? "spectral-flux";
}

function calculateSegmentDb(buffer: Float32Array): number {
  if (!buffer.length) return -Infinity;
  const rms = Math.sqrt(buffer.reduce((sum, s) => sum + s * s, 0) / buffer.length);
  return 20 * Math.log10(Math.max(rms, 1e-10));
}

function analyzeVolume(audioBuffer: Float32Array, config: MetricConfig[], deviceDbOffset = 0): VolumeResult {
  const t = getMetricConfig(config, "volume")?.thresholds ?? { min: -35, ideal: -15, max: 0 };
  const db = calculateSegmentDb(audioBuffer) + deviceDbOffset;

  let score = 0;
  if (db >= t.ideal && db <= t.max) {
    const midpoint = (t.ideal + t.max) / 2;
    score = db <= midpoint ? 90 + ((db - t.ideal) / (midpoint - t.ideal)) * 10 : 100 - ((db - midpoint) / (t.max - midpoint)) * 10;
  } else if (db > t.max) {
    score = Math.max(0, 90 - (db - t.max) * 5);
  } else if (db >= t.min) {
    score = ((db - t.min) / (t.ideal - t.min)) * 90;
  }

  return { averageDb: Math.round(db * 10) / 10, score: Math.round(Math.max(0, Math.min(100, score))), tag: "ENERGY" };
}

function detectSyllablesEnergy(audioBuffer: Float32Array, sampleRate: number): number {
  const frame = Math.floor(sampleRate * 0.02);
  const hop = Math.max(1, Math.floor(frame / 2));
  const energies: number[] = [];
  for (let i = 0; i < audioBuffer.length - frame; i += hop) {
    let e = 0;
    for (let j = 0; j < frame; j++) e += audioBuffer[i + j] * audioBuffer[i + j];
    energies.push(e / frame);
  }
  if (!energies.length) return 0;
  const threshold = Math.max(...energies) * 0.15;
  let peaks = 0;
  let last = -10;
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > threshold && energies[i] > energies[i - 1] && energies[i] > energies[i + 1] && i - last > 3) {
      peaks++;
      last = i;
    }
  }
  return peaks;
}

function detectSyllablesSpectralFlux(audioBuffer: Float32Array, sampleRate: number): number {
  const frameSize = Math.floor(sampleRate * 0.02);
  const hop = Math.max(1, Math.floor(frameSize / 2));
  const bins = 128;
  const flux: number[] = [];

  let prev = new Float32Array(bins);
  for (let i = 0; i <= audioBuffer.length - frameSize; i += hop) {
    const spec = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      let real = 0;
      let imag = 0;
      const w = (2 * Math.PI * k) / frameSize;
      for (let n = 0; n < frameSize; n++) {
        const s = audioBuffer[i + n];
        real += s * Math.cos(w * n);
        imag -= s * Math.sin(w * n);
      }
      spec[k] = Math.sqrt(real * real + imag * imag);
    }

    let f = 0;
    for (let k = 0; k < bins; k++) {
      const d = spec[k] - prev[k];
      if (d > 0) f += d;
    }
    flux.push(f);
    prev = spec;
  }

  if (!flux.length) return 0;
  const sorted = [...flux].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const threshold = Math.max(median * 1.5, (sorted[Math.floor(sorted.length * 0.75)] || median) * 0.5);

  let peaks = 0;
  let last = -5;
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] > threshold && flux[i] > flux[i - 1] && flux[i] > flux[i + 1] && i - last > 4) {
      peaks++;
      last = i;
    }
  }
  return Math.max(1, peaks);
}

async function transcribeWordCount(audioBlob: Blob): Promise<{ wordCount: number; transcript?: string }> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  const resultA = await supabase.functions.invoke("transcribe", { body: formData });
  if (!resultA.error && resultA.data) {
    const words = Array.isArray(resultA.data.words) ? resultA.data.words : [];
    return { wordCount: words.length, transcript: resultA.data.transcript || "" };
  }

  const resultB = await supabase.functions.invoke("deepgram-transcribe", { body: formData });
  if (!resultB.error && resultB.data) {
    const wc = Number(resultB.data.wordsPerMinute) > 0 && Number(resultB.data.duration) > 0
      ? Math.round((Number(resultB.data.wordsPerMinute) * Number(resultB.data.duration)) / 60)
      : Array.isArray(resultB.data.words) ? resultB.data.words.length : 0;
    return { wordCount: wc, transcript: resultB.data.transcript || "" };
  }

  throw new Error("Deepgram transcription unavailable");
}

function scoreSpeechRate(wpm: number, config: MetricConfig[]): number {
  const t = getMetricConfig(config, "speechRate")?.thresholds ?? { min: 90, ideal: 150, max: 220 };
  if (wpm <= 0) return 0;
  if (wpm < t.min) return 0;
  if (wpm < t.ideal) return ((wpm - t.min) / (t.ideal - t.min)) * 100;
  return 100;
}

async function analyzeSpeechRate(
  audioBuffer: Float32Array,
  sampleRate: number,
  config: MetricConfig[],
  durationSeconds: number,
  method: SpeechRateMethod,
  audioBlob?: Blob,
  sttWordCount?: number,
): Promise<SpeechRateResult> {
  let wordsPerMinute = 0;
  let transcript: string | undefined;
  let usedMethod = method;

  if (method === "deepgram-stt" && (audioBlob || sttWordCount)) {
    try {
      let dgResult: { wordCount: number; transcript?: string } | null = null;
      if (audioBlob && sttWordCount == null) {
        dgResult = await transcribeWordCount(audioBlob);
        transcript = dgResult.transcript;
      }
      const wordCount = sttWordCount ?? dgResult?.wordCount ?? 0;
      wordsPerMinute = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
    } catch {
      usedMethod = "spectral-flux";
    }
  }

  if (!wordsPerMinute) {
    const syllables = usedMethod === "spectral-flux" ? detectSyllablesSpectralFlux(audioBuffer, sampleRate) : detectSyllablesEnergy(audioBuffer, sampleRate);
    const syllablesPerSecond = durationSeconds > 0 ? syllables / durationSeconds : 0;
    wordsPerMinute = Math.round((syllablesPerSecond * 60) / 1.5);
  }

  const syllablesPerSecond = (wordsPerMinute / 60) * 1.5;
  const score = scoreSpeechRate(wordsPerMinute, config);

  return {
    wordsPerMinute,
    syllablesPerSecond: Math.round(syllablesPerSecond * 10) / 10,
    score: Math.round(Math.max(0, Math.min(100, score))),
    tag: "FLUENCY",
    method: usedMethod,
    transcript,
  };
}

function analyzeAcceleration(audioBuffer: Float32Array, sampleRate: number, config: MetricConfig[]): AccelerationResult {
  const midpoint = Math.floor(audioBuffer.length / 2);
  const seg1 = audioBuffer.slice(0, midpoint);
  const seg2 = audioBuffer.slice(midpoint);

  const vol1 = calculateSegmentDb(seg1);
  const vol2 = calculateSegmentDb(seg2);

  const dur1 = seg1.length / sampleRate;
  const dur2 = seg2.length / sampleRate;
  const rate1 = Math.round((detectSyllablesSpectralFlux(seg1, sampleRate) / Math.max(dur1, 0.1) / 1.5) * 60);
  const rate2 = Math.round((detectSyllablesSpectralFlux(seg2, sampleRate) / Math.max(dur2, 0.1) / 1.5) * 60);

  const volumeIncrease = vol2 - vol1;
  const rateIncrease = rate2 - rate1;
  const isAccelerating = volumeIncrease > 0 || rateIncrease > 5;
  const score = Math.round(Math.max(0, Math.min(100, 50 + Math.max(0, volumeIncrease * 2 + rateIncrease * 0.5))));

  return {
    score,
    segment1Volume: Math.round(vol1 * 10) / 10,
    segment2Volume: Math.round(vol2 * 10) / 10,
    segment1Rate: rate1,
    segment2Rate: rate2,
    isAccelerating,
    tag: "DYNAMICS",
  };
}

function analyzeResponseTime(audioBuffer: Float32Array, sampleRate: number, config: MetricConfig[]): ResponseTimeResult {
  const t = getMetricConfig(config, "responseTime")?.thresholds ?? { min: 2000, ideal: 200, max: 0 };
  const noiseFloor = calculateAdaptiveNoiseFloor(audioBuffer, sampleRate);
  let first = 0;

  for (let i = 0; i < audioBuffer.length; i++) {
    if (Math.abs(audioBuffer[i]) > noiseFloor) {
      first = i;
      break;
    }
  }

  const responseTimeMs = Math.round((first / sampleRate) * 1000);

  let score = 0;
  if (responseTimeMs <= t.ideal) score = 100;
  else if (responseTimeMs <= t.min) score = 100 - ((responseTimeMs - t.ideal) / (t.min - t.ideal)) * 50;
  else score = Math.max(0, 50 * (1 - (responseTimeMs - t.min) / 3000));

  return { responseTimeMs, score: Math.round(Math.max(0, Math.min(100, score))), tag: "READINESS" };
}

function calculateAdaptiveNoiseFloor(audioBuffer: Float32Array, sampleRate: number): number {
  const frameSamples = Math.floor(sampleRate * 0.1);
  const segment = audioBuffer.slice(0, Math.min(frameSamples, audioBuffer.length));
  if (!segment.length) return 0.01;
  let sum = 0;
  for (let i = 0; i < segment.length; i++) sum += segment[i] * segment[i];
  const rms = Math.sqrt(sum / segment.length);
  return Math.max(0.005, rms * 3);
}

function analyzePauses(audioBuffer: Float32Array, sampleRate: number, config: MetricConfig[], vadMetrics?: VADMetrics): PauseManagementResult {
  const t = getMetricConfig(config, "pauseManagement")?.thresholds ?? { min: 0, ideal: 0, max: 2.71 };

  let pauseRatio = 0;
  let pauseCount = 0;
  let maxPause = 0;
  let avgPause = 0;

  if (vadMetrics?.speechSegments?.length) {
    pauseRatio = 1 - Math.max(0, Math.min(1, vadMetrics.speechRatio));
    const sorted = [...vadMetrics.speechSegments].sort((a, b) => a.start - b.start);
    const pausesMs: number[] = [];
    let cursor = 0;
    for (const seg of sorted) {
      if (seg.start > cursor) pausesMs.push(seg.start - cursor);
      cursor = Math.max(cursor, seg.end);
    }
    const totalMs = (audioBuffer.length / sampleRate) * 1000;
    if (cursor < totalMs) pausesMs.push(totalMs - cursor);
    const significant = pausesMs.filter((p) => p >= 150);
    pauseCount = significant.length;
    maxPause = significant.length ? Math.max(...significant) / 1000 : 0;
    avgPause = significant.length ? significant.reduce((a, b) => a + b, 0) / significant.length / 1000 : 0;
  } else {
    const frame = Math.floor(sampleRate * 0.05);
    const threshold = 0.01;
    let silentFrames = 0;
    let totalFrames = 0;
    let currentSilent = 0;
    const pausesSec: number[] = [];

    for (let i = 0; i < audioBuffer.length - frame; i += frame) {
      let energy = 0;
      for (let j = 0; j < frame; j++) energy += Math.abs(audioBuffer[i + j]);
      energy /= frame;

      const silent = energy < threshold;
      if (silent) {
        silentFrames++;
        currentSilent += frame / sampleRate;
      } else {
        if (currentSilent >= 0.15) pausesSec.push(currentSilent);
        currentSilent = 0;
      }
      totalFrames++;
    }

    if (currentSilent >= 0.15) pausesSec.push(currentSilent);
    pauseRatio = silentFrames / Math.max(1, totalFrames);
    pauseCount = pausesSec.length;
    maxPause = pausesSec.length ? Math.max(...pausesSec) : 0;
    avgPause = pausesSec.length ? pausesSec.reduce((a, b) => a + b, 0) / pausesSec.length : 0;
  }

  let score = 100;
  if (pauseRatio > 0.1) {
    score = Math.max(0, 100 - ((pauseRatio - 0.1) / t.max) * 100);
  }

  return {
    pauseCount,
    avgPauseDuration: Math.round(avgPause * 100) / 100,
    maxPauseDuration: Math.round(maxPause * 100) / 100,
    pauseRatio: Math.round(pauseRatio * 100) / 100,
    score: Math.round(Math.max(0, Math.min(100, score))),
    tag: "FLUIDITY",
  };
}

function normalizedWeights(config: MetricConfig[]) {
  const get = (id: string) => getMetricConfig(config, id)?.weight ?? 0;
  const raw = {
    volume: get("volume"),
    speechRate: get("speechRate"),
    acceleration: get("acceleration"),
    responseTime: get("responseTime"),
    pauseManagement: get("pauseManagement"),
  };
  const total = Math.max(1, raw.volume + raw.speechRate + raw.acceleration + raw.responseTime + raw.pauseManagement);
  return {
    volume: raw.volume / total,
    speechRate: raw.speechRate / total,
    acceleration: raw.acceleration / total,
    responseTime: raw.responseTime / total,
    pauseManagement: raw.pauseManagement / total,
  };
}

function buildFeedback(result: {
  volume: VolumeResult;
  speechRate: SpeechRateResult;
  acceleration: AccelerationResult;
  responseTime: ResponseTimeResult;
  pauses: PauseManagementResult;
  overallScore: number;
}): string[] {
  const feedback: string[] = [];
  if (result.volume.score < 60) feedback.push("Speak louder and keep your voice energy more stable.");
  if (result.speechRate.score < 60) {
    if (result.speechRate.wordsPerMinute < 100) feedback.push("Try speaking a bit faster for more natural fluency.");
    else feedback.push("Slow down slightly to improve clarity.");
  }
  if (result.responseTime.score < 60) feedback.push("Start speaking sooner after the prompt.");
  if (result.pauses.score < 60) feedback.push("Reduce long pauses to keep smoother flow.");
  if (result.acceleration.score < 60) feedback.push("Build momentum from start to finish.");
  if (!feedback.length) {
    feedback.push(result.overallScore >= 90 ? "Excellent work. Strong delivery and control." : "Great job. Keep this rhythm and consistency.");
  }
  return feedback;
}

export async function analyzeAudioAsync(
  audioBuffer: Float32Array,
  sampleRate: number,
  audio?: {
    audioBlob?: Blob;
    audioBase64?: string;
    mimeType?: string;
    deviceId?: string;
    vadMetrics?: VADMetrics;
    sttWordCount?: number;
  },
): Promise<AnalysisResult> {
  const config = await getConfigAsync();
  const method = getSpeechRateMethod(config);

  const hasSpeech = audio?.vadMetrics ? audio.vadMetrics.speechRatio > 0.02 && audio.vadMetrics.totalSpeechTime > 200 : true;
  if (!hasSpeech) {
    const zeroPauses: PauseManagementResult = {
      pauseCount: 0,
      avgPauseDuration: 0,
      maxPauseDuration: 0,
      pauseRatio: 1,
      score: 0,
      tag: "FLUIDITY",
    };
    return {
      volume: { averageDb: -Infinity, score: 0, tag: "ENERGY" },
      speechRate: { wordsPerMinute: 0, syllablesPerSecond: 0, score: 0, tag: "FLUENCY", method },
      acceleration: { score: 0, segment1Volume: 0, segment2Volume: 0, segment1Rate: 0, segment2Rate: 0, isAccelerating: false, tag: "DYNAMICS" },
      responseTime: { responseTimeMs: 0, score: 0, tag: "READINESS" },
      pauseManagement: zeroPauses,
      pauses: zeroPauses,
      overallScore: 0,
      emotionalFeedback: "poor",
      metrics: { volume: 0, speechRate: 0, pauses: 0, latency: 0, endIntensity: 0 },
      feedback: ["No speech detected. Please try again and speak clearly."],
    };
  }

  let processed = audioBuffer;
  let normalization: AnalysisResult["normalization"] = undefined;
  let deviceOffset = 0;

  if (audio?.deviceId) {
    const normalized = calibrateAndNormalize(audioBuffer, sampleRate, audio.deviceId);
    processed = normalized.normalized;
    normalization = {
      originalLUFS: Math.round(normalized.originalLUFS * 10) / 10,
      calibratedLUFS: Math.round(normalized.calibratedLUFS * 10) / 10,
      finalLUFS: Math.round(normalized.finalLUFS * 10) / 10,
      deviceGain: Math.round(normalized.deviceGain * 100) / 100,
      normalizationGain: Math.round(normalized.normalizationGain * 100) / 100,
    };

    const profile = getCalibrationProfile(audio.deviceId);
    if (profile) deviceOffset = TARGET_LUFS - profile.referenceLevel;
  }

  const volume = analyzeVolume(audioBuffer, config, deviceOffset);

  const durationTotal = processed.length / sampleRate;
  const durationSeconds = audio?.vadMetrics
    ? Math.max(0.1, durationTotal - (durationTotal - audio.vadMetrics.totalSpeechTime / 1000) / 2)
    : Math.max(0.1, durationTotal);

  const speechRate = await analyzeSpeechRate(
    processed,
    sampleRate,
    config,
    durationSeconds,
    method,
    audio?.audioBlob,
    audio?.sttWordCount,
  );
  const acceleration = analyzeAcceleration(processed, sampleRate, config);
  const responseTime = analyzeResponseTime(processed, sampleRate, config);
  const pauseManagement = analyzePauses(processed, sampleRate, config, audio?.vadMetrics);

  const weights = normalizedWeights(config);
  const overallScore = Math.round(
    volume.score * weights.volume +
      speechRate.score * weights.speechRate +
      acceleration.score * weights.acceleration +
      responseTime.score * weights.responseTime +
      pauseManagement.score * weights.pauseManagement,
  );

  const emotionalFeedback: AnalysisResult["emotionalFeedback"] = overallScore >= 70 ? "excellent" : overallScore >= 40 ? "good" : "poor";
  const feedback = buildFeedback({ volume, speechRate, acceleration, responseTime, pauses: pauseManagement, overallScore });

  return {
    volume,
    speechRate,
    acceleration,
    responseTime,
    pauseManagement,
    pauses: pauseManagement,
    overallScore,
    emotionalFeedback,
    normalization,
    metrics: {
      volume: volume.score,
      speechRate: speechRate.score,
      pauses: pauseManagement.score,
      latency: responseTime.score,
      endIntensity: acceleration.score,
    },
    feedback,
  };
}

export function analyzeAudio(audioBuffer: Float32Array, sampleRate: number): AnalysisResult {
  const config = getConfigFromLocalStorage() || DEFAULT_CONFIG;
  const volume = analyzeVolume(audioBuffer, config);
  const speechRate = {
    wordsPerMinute: 0,
    syllablesPerSecond: 0,
    score: 0,
    tag: "FLUENCY" as const,
    method: "energy-peaks" as SpeechRateMethod,
  };
  const acceleration = analyzeAcceleration(audioBuffer, sampleRate, config);
  const responseTime = analyzeResponseTime(audioBuffer, sampleRate, config);
  const pauseManagement = analyzePauses(audioBuffer, sampleRate, config);
  const weights = normalizedWeights(config);
  const overallScore = Math.round(
    volume.score * weights.volume +
      speechRate.score * weights.speechRate +
      acceleration.score * weights.acceleration +
      responseTime.score * weights.responseTime +
      pauseManagement.score * weights.pauseManagement,
  );

  return {
    volume,
    speechRate,
    acceleration,
    responseTime,
    pauseManagement,
    pauses: pauseManagement,
    overallScore,
    emotionalFeedback: overallScore >= 70 ? "excellent" : overallScore >= 40 ? "good" : "poor",
    metrics: {
      volume: volume.score,
      speechRate: speechRate.score,
      pauses: pauseManagement.score,
      latency: responseTime.score,
      endIntensity: acceleration.score,
    },
    feedback: buildFeedback({ volume, speechRate, acceleration, responseTime, pauses: pauseManagement, overallScore }),
  };
}
