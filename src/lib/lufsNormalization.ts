/**
 * LUFS (Loudness Units relative to Full Scale) Normalization
 * Based on ITU-R BS.1770-4 standard for objective loudness measurement
 */

export interface CalibrationProfile {
  deviceId: string;
  deviceLabel: string;
  noiseFloor: number;
  referenceLevel: number;
  gainAdjustment: number;
  createdAt: number;
  lastUsed: number;
  recordingHistory?: RecordingStats[];
}

export interface RecordingStats {
  timestamp: number;
  originalLUFS: number;
  calibratedLUFS: number;
  finalLUFS: number;
  noiseFloor: number;
}

export interface RecalibrationSuggestion {
  shouldRecalibrate: boolean;
  reason?: string;
  variance?: number;
  threshold?: number;
}

const CALIBRATION_STORAGE_KEY = 'audio_calibration_profiles';
export const TARGET_LUFS = -23;
const MAX_RECORDING_HISTORY = 10;
const VARIANCE_THRESHOLD = 5;

export function saveCalibrationProfile(profile: CalibrationProfile): void {
  try {
    const profiles = getCalibrationProfiles();
    const idx = profiles.findIndex((p) => p.deviceId === profile.deviceId);
    if (idx >= 0) profiles[idx] = profile;
    else profiles.push(profile);
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save calibration profile:', e);
  }
}

export function getCalibrationProfiles(): CalibrationProfile[] {
  try {
    const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getCalibrationProfile(deviceId: string): CalibrationProfile | null {
  const profiles = getCalibrationProfiles();
  const profile = profiles.find((p) => p.deviceId === deviceId);
  if (!profile) return null;
  profile.lastUsed = Date.now();
  saveCalibrationProfile(profile);
  return profile;
}

export function deleteCalibrationProfile(deviceId: string): void {
  const profiles = getCalibrationProfiles().filter((p) => p.deviceId !== deviceId);
  localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(profiles));
}

export function calculateNoiseFloor(audioBuffer: Float32Array, sampleRate: number): number {
  const frameSamples = Math.floor(sampleRate * 0.1);
  const noiseSegment = audioBuffer.slice(0, Math.min(frameSamples, audioBuffer.length));
  if (noiseSegment.length === 0) return -Infinity;
  let sum = 0;
  for (let i = 0; i < noiseSegment.length; i++) sum += noiseSegment[i] * noiseSegment[i];
  const rms = Math.sqrt(sum / noiseSegment.length);
  return 20 * Math.log10(Math.max(rms, 1e-10));
}

function calculateMeanSquareWithGating(audioBuffer: Float32Array, sampleRate: number): number {
  const blockSize = Math.floor(sampleRate * 0.4);
  const overlap = Math.floor(blockSize * 0.75);
  const hop = Math.max(1, blockSize - overlap);
  const blocks: number[] = [];

  for (let i = 0; i < audioBuffer.length - blockSize; i += hop) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      const s = audioBuffer[i + j];
      sum += s * s;
    }
    blocks.push(sum / blockSize);
  }

  if (blocks.length === 0) return 0;

  const absoluteGate = Math.pow(10, -70 / 10);
  const gated = blocks.filter((ms) => ms >= absoluteGate);
  if (gated.length === 0) return 0;

  const avg = gated.reduce((a, b) => a + b, 0) / gated.length;
  const relativeGate = avg * Math.pow(10, -10 / 10);
  const finalBlocks = gated.filter((ms) => ms >= relativeGate);
  if (finalBlocks.length === 0) return avg;
  return finalBlocks.reduce((a, b) => a + b, 0) / finalBlocks.length;
}

export function calculateLUFS(audioBuffer: Float32Array, sampleRate: number): number {
  if (audioBuffer.length === 0) return -Infinity;
  const meanSquare = calculateMeanSquareWithGating(audioBuffer, sampleRate);
  if (meanSquare === 0) return -Infinity;
  return -0.691 + 10 * Math.log10(meanSquare);
}

export function normalizeToLUFS(
  audioBuffer: Float32Array,
  sampleRate: number,
  targetLUFS: number = TARGET_LUFS,
): { normalized: Float32Array; currentLUFS: number; gainDB: number; gainLinear: number } {
  const currentLUFS = calculateLUFS(audioBuffer, sampleRate);
  if (!isFinite(currentLUFS)) {
    return { normalized: audioBuffer, currentLUFS: -Infinity, gainDB: 0, gainLinear: 1 };
  }

  const gainDB = targetLUFS - currentLUFS;
  const gainLinear = Math.pow(10, gainDB / 20);
  const normalized = new Float32Array(audioBuffer.length);
  for (let i = 0; i < audioBuffer.length; i++) {
    normalized[i] = Math.max(-1, Math.min(1, audioBuffer[i] * gainLinear));
  }

  return { normalized, currentLUFS, gainDB, gainLinear };
}

export function createCalibrationProfile(
  deviceId: string,
  deviceLabel: string,
  noiseFloor: number,
  referenceLevel: number,
  targetLevel: number = TARGET_LUFS,
): CalibrationProfile {
  const gainDB = targetLevel - referenceLevel;
  const gainAdjustment = Math.pow(10, gainDB / 20);

  return {
    deviceId,
    deviceLabel,
    noiseFloor,
    referenceLevel,
    gainAdjustment: Math.max(0.1, Math.min(10, gainAdjustment)),
    createdAt: Date.now(),
    lastUsed: Date.now(),
    recordingHistory: [],
  };
}

export function trackRecording(deviceId: string, stats: Omit<RecordingStats, 'timestamp'>): void {
  const profile = getCalibrationProfile(deviceId);
  if (!profile) return;

  if (!profile.recordingHistory) profile.recordingHistory = [];
  profile.recordingHistory.push({ ...stats, timestamp: Date.now() });
  if (profile.recordingHistory.length > MAX_RECORDING_HISTORY) {
    profile.recordingHistory = profile.recordingHistory.slice(-MAX_RECORDING_HISTORY);
  }

  saveCalibrationProfile(profile);
}

function calcStd(values: number[]): number {
  if (values.length < 3) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sq = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(sq.reduce((a, b) => a + b, 0) / values.length);
}

export function checkRecalibrationNeeded(deviceId: string): RecalibrationSuggestion {
  const profile = getCalibrationProfile(deviceId);
  if (!profile || !profile.recordingHistory || profile.recordingHistory.length < 3) {
    return { shouldRecalibrate: false };
  }

  const history = profile.recordingHistory;
  const lufsVar = calcStd(history.map((h) => h.originalLUFS));
  if (lufsVar > VARIANCE_THRESHOLD) {
    return {
      shouldRecalibrate: true,
      reason: `High variance in audio levels detected (${lufsVar.toFixed(1)} LUFS).`,
      variance: lufsVar,
      threshold: VARIANCE_THRESHOLD,
    };
  }

  const noiseVar = calcStd(history.map((h) => h.noiseFloor));
  if (noiseVar > 10) {
    return {
      shouldRecalibrate: true,
      reason: `Background noise level changed significantly (${noiseVar.toFixed(1)} dB).`,
      variance: noiseVar,
      threshold: 10,
    };
  }

  const daysSince = (Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24);
  if (daysSince > 30) {
    return { shouldRecalibrate: true, reason: `Calibration is ${Math.floor(daysSince)} days old.` };
  }

  return { shouldRecalibrate: false };
}

export function getRecalibrationStatus(deviceId: string): { status: 'good' | 'warning' | 'recommend'; message: string; variance?: number } {
  const suggestion = checkRecalibrationNeeded(deviceId);
  if (!suggestion.shouldRecalibrate) {
    return { status: 'good', message: 'Calibration is accurate and up to date.' };
  }

  const severity = suggestion.variance && suggestion.threshold ? suggestion.variance / suggestion.threshold : 1.5;
  if (severity > 2) {
    return { status: 'recommend', message: suggestion.reason || 'Recalibration strongly recommended.', variance: suggestion.variance };
  }

  return { status: 'warning', message: suggestion.reason || 'Consider recalibrating soon.', variance: suggestion.variance };
}

export function calibrateAndNormalize(
  audioBuffer: Float32Array,
  sampleRate: number,
  deviceId?: string,
  targetLUFS: number = TARGET_LUFS,
): {
  normalized: Float32Array;
  originalLUFS: number;
  calibratedLUFS: number;
  finalLUFS: number;
  deviceGain: number;
  normalizationGain: number;
} {
  let processed = audioBuffer;
  let deviceGain = 1;
  const originalLUFS = calculateLUFS(audioBuffer, sampleRate);

  if (deviceId) {
    const profile = getCalibrationProfile(deviceId);
    if (profile && profile.gainAdjustment !== 1) {
      deviceGain = profile.gainAdjustment;
      processed = new Float32Array(audioBuffer.length);
      for (let i = 0; i < audioBuffer.length; i++) {
        processed[i] = Math.max(-1, Math.min(1, audioBuffer[i] * deviceGain));
      }
    }
  }

  const calibratedLUFS = calculateLUFS(processed, sampleRate);
  const { normalized, gainLinear } = normalizeToLUFS(processed, sampleRate, targetLUFS);
  const finalLUFS = calculateLUFS(normalized, sampleRate);

  if (deviceId) {
    trackRecording(deviceId, {
      originalLUFS,
      calibratedLUFS,
      finalLUFS,
      noiseFloor: calculateNoiseFloor(audioBuffer, sampleRate),
    });
  }

  return {
    normalized,
    originalLUFS,
    calibratedLUFS,
    finalLUFS,
    deviceGain,
    normalizationGain: gainLinear,
  };
}

export async function measureReferenceLevel(audioBuffer: Float32Array, sampleRate: number): Promise<number> {
  return calculateLUFS(audioBuffer, sampleRate);
}
