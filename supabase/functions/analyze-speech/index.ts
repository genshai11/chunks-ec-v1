import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AudioMetrics {
  volume: number;        // -45 to -20 dB scale
  speechRate: number;    // Words per minute
  pauseCount: number;    // Number of pauses detected
  longestPause: number;  // Duration in ms
  latency: number;       // Time to first speech in ms
  endIntensity: number;  // 0-100 scale
}

interface ScoringConfig {
  volume: { weight: number };
  speech_rate: { weight: number };
  pauses: { weight: number };
  latency: { weight: number };
  end_intensity: { weight: number };
}

function calculateScore(metrics: AudioMetrics, config: ScoringConfig): number {
  // Volume score: -45dB = 0%, -20dB = 100%
  const volumeScore = Math.min(100, Math.max(0, ((metrics.volume + 45) / 25) * 100));
  
  // Speech rate score: 80 WPM = 0%, 150 WPM = 100%
  const speechRateScore = Math.min(100, Math.max(0, ((metrics.speechRate - 80) / 70) * 100));
  
  // Pause score: 0 pauses = 100%, penalize for long pauses
  let pauseScore = 100;
  if (metrics.pauseCount > 0) {
    pauseScore = Math.max(0, 100 - (metrics.pauseCount * 15));
    if (metrics.longestPause > 1500) pauseScore = Math.max(0, pauseScore - 20);
  }
  
  // Latency score: ≤500ms = 100%, >3000ms = 0%
  const latencyScore = Math.min(100, Math.max(0, ((3000 - metrics.latency) / 2500) * 100));
  
  // End intensity score: Higher at end = better
  const endIntensityScore = metrics.endIntensity;
  
  // Calculate weighted total
  const totalScore = 
    volumeScore * config.volume.weight +
    speechRateScore * config.speech_rate.weight +
    pauseScore * config.pauses.weight +
    latencyScore * config.latency.weight +
    endIntensityScore * config.end_intensity.weight;
  
  return Math.round(totalScore);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      audio,
      transcription,
      metrics: clientMetrics,
      scoringConfig 
    } = await req.json();

    // Use provided metrics or default values
    const metrics: AudioMetrics = clientMetrics || {
      volume: -30,
      speechRate: 120,
      pauseCount: 0,
      longestPause: 0,
      latency: 400,
      endIntensity: 80
    };

    // Default scoring config if not provided
    const config: ScoringConfig = scoringConfig || {
      volume: { weight: 0.20 },
      speech_rate: { weight: 0.25 },
      pauses: { weight: 0.15 },
      latency: { weight: 0.15 },
      end_intensity: { weight: 0.25 }
    };

    const score = calculateScore(metrics, config);

    // Calculate individual metric scores for detailed feedback
    const volumeScore = Math.min(100, Math.max(0, ((metrics.volume + 45) / 25) * 100));
    const speechRateScore = Math.min(100, Math.max(0, ((metrics.speechRate - 80) / 70) * 100));
    let pauseScore = 100;
    if (metrics.pauseCount > 0) {
      pauseScore = Math.max(0, 100 - (metrics.pauseCount * 15));
      if (metrics.longestPause > 1500) pauseScore = Math.max(0, pauseScore - 20);
    }
    const latencyScore = Math.min(100, Math.max(0, ((3000 - metrics.latency) / 2500) * 100));
    const endIntensityScore = metrics.endIntensity;

    return new Response(
      JSON.stringify({
        score,
        metrics: {
          volume: Math.round(volumeScore),
          speechRate: Math.round(speechRateScore),
          pauses: Math.round(pauseScore),
          latency: Math.round(latencyScore),
          endIntensity: Math.round(endIntensityScore)
        },
        rawMetrics: metrics,
        transcription: transcription || '',
        feedback: generateFeedback(score, metrics)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-speech:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateFeedback(score: number, metrics: AudioMetrics): string[] {
  const feedback: string[] = [];
  
  if (score >= 90) {
    feedback.push('Excellent pronunciation and delivery!');
  } else if (score >= 70) {
    feedback.push('Good job! Keep practicing to improve further.');
  } else if (score >= 50) {
    feedback.push('Not bad, but there\'s room for improvement.');
  } else {
    feedback.push('Keep practicing! Focus on the areas below.');
  }
  
  if (metrics.volume < -35) {
    feedback.push('Try speaking a bit louder for better clarity.');
  }
  
  if (metrics.speechRate < 100) {
    feedback.push('Try to speak a bit faster to sound more natural.');
  } else if (metrics.speechRate > 160) {
    feedback.push('Slow down slightly for better clarity.');
  }
  
  if (metrics.pauseCount > 3) {
    feedback.push('Try to reduce the number of pauses.');
  }
  
  if (metrics.latency > 1500) {
    feedback.push('Try to respond more quickly next time.');
  }
  
  return feedback;
}
