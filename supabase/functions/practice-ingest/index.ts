/**
 * practice-ingest (Edge Function)
 *
 * Single endpoint to:
 *  - create a take
 *  - transcribe audio (Deepgram)
 *  - optionally score using analyze-speech
 *  - persist transcript + scores
 *
 * Auth: requires an authenticated Supabase user (Authorization header).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DeepgramWord = {
  word: string;
  start?: number;
  end?: number;
  confidence?: number;
  punctuated_word?: string;
};

type TranscribeResult = {
  transcript: string;
  confidence: number;
  duration: number;
  words: DeepgramWord[];
  wordCount: number;
  wordsPerMinute: number;
};

type AnalyzeSpeechResult = {
  score: number;
  metrics: {
    volume: number;
    speechRate: number;
    pauses: number;
    latency: number;
    endIntensity: number;
  };
  rawMetrics: {
    volume: number;
    speechRate: number;
    pauseCount: number;
    longestPause: number;
    latency: number;
    endIntensity: number;
  };
  transcription: string;
  feedback: string[];
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function decodeBase64(base64: string): Uint8Array {
  const normalized = base64.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deepgramTranscribe(audioBytes: Uint8Array, mimeType: string): Promise<TranscribeResult> {
  const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");
  if (!deepgramApiKey) throw new Error("DEEPGRAM_API_KEY is not configured");

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&punctuate=true&filler_words=false&numerals=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
        "Content-Type": mimeType || "audio/webm",
      },
      body: audioBytes,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Deepgram API error:", response.status, errorText);
    throw new Error(`Deepgram API error: ${response.status}`);
  }

  const result = await response.json();
  const alt = result?.results?.channels?.[0]?.alternatives?.[0];

  const transcript: string = (alt?.transcript ?? "").trim();
  const confidence: number = alt?.confidence ?? 0;
  const words: DeepgramWord[] = alt?.words ?? [];
  const wordCount = words.length;
  const duration: number = result?.metadata?.duration ?? 0;

  return {
    transcript,
    confidence,
    duration,
    words,
    wordCount,
    wordsPerMinute: duration > 0 ? Math.round((wordCount / duration) * 60) : 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY not configured in Edge Function env");
    }

    // Create client in Edge Function context.
    // We forward the user's Authorization so RLS applies.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
      auth: {
        persistSession: false,
      },
    });

    // Verify user.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

    // Input: multipart preferred. Fallback to JSON base64.
    const contentType = req.headers.get("content-type") ?? "";

    let audioBytes: Uint8Array;
    let mimeType = "audio/webm";

    let lessonId: string | null = null;
    let category: string | null = null;
    let itemIndex: number | null = null;
    let sessionId: string | null = null;
    let clientMetrics: AnalyzeSpeechResult["rawMetrics"] | null = null;
    let scoreOnServer = true;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const audioFile = formData.get("audio") as File | null;
      if (!audioFile) return json({ error: "No audio file provided" }, { status: 400 });

      audioBytes = new Uint8Array(await audioFile.arrayBuffer());
      mimeType = audioFile.type || mimeType;

      lessonId = (formData.get("lessonId") as string | null) ?? null;
      category = (formData.get("category") as string | null) ?? null;
      const rawItemIndex = (formData.get("itemIndex") as string | null) ?? null;
      itemIndex = rawItemIndex ? Number(rawItemIndex) : null;

      sessionId = (formData.get("sessionId") as string | null) ?? null;

      const rawMetricsStr = (formData.get("metrics") as string | null) ?? null;
      if (rawMetricsStr) {
        try {
          clientMetrics = JSON.parse(rawMetricsStr);
        } catch {
          clientMetrics = null;
        }
      }

      const rawScoreOnServer = (formData.get("scoreOnServer") as string | null) ?? null;
      if (rawScoreOnServer) scoreOnServer = rawScoreOnServer !== "false";
    } else {
      const body = (await req.json()) as {
        audio?: string;
        mimeType?: string;
        lessonId?: string;
        category?: string;
        itemIndex?: number;
        sessionId?: string;
        metrics?: AnalyzeSpeechResult["rawMetrics"];
        scoreOnServer?: boolean;
      };

      if (!body.audio) return json({ error: "No audio data provided" }, { status: 400 });

      audioBytes = decodeBase64(body.audio);
      mimeType = body.mimeType || mimeType;
      lessonId = body.lessonId ?? null;
      category = body.category ?? null;
      itemIndex = typeof body.itemIndex === "number" ? body.itemIndex : null;
      sessionId = body.sessionId ?? null;
      clientMetrics = body.metrics ?? null;
      scoreOnServer = body.scoreOnServer ?? true;
    }

    // 1) Create take record.
    const takeInsert = {
      user_id: userId,
      lesson_id: lessonId,
      category,
      item_index: itemIndex,
      session_id: sessionId,
      audio_mime_type: mimeType,
    };

    const { data: takeRow, error: takeError } = await supabase
      .from("practice_takes")
      .insert(takeInsert)
      .select("id")
      .single();

    if (takeError) throw takeError;

    // 2) Transcribe.
    const transcribe = await deepgramTranscribe(audioBytes, mimeType);

    const { error: transcriptError } = await supabase
      .from("practice_transcripts")
      .insert({
        take_id: takeRow.id,
        provider: "deepgram",
        transcript: transcribe.transcript,
        confidence: transcribe.confidence,
        words: transcribe.words,
        raw: transcribe,
      });

    if (transcriptError) throw transcriptError;

    // 3) Optionally score on server.
    let analyze: AnalyzeSpeechResult | null = null;

    if (scoreOnServer) {
      // Use provided raw metrics when available (client can compute), else do a minimal server-only score using WPM.
      // NOTE: Server cannot extract volume/pause/latency from encoded audio cheaply without extra DSP.
      const metrics =
        clientMetrics ??
        ({
          volume: -30,
          speechRate: transcribe.wordsPerMinute,
          pauseCount: 0,
          longestPause: 0,
          latency: 400,
          endIntensity: 80,
        } satisfies AnalyzeSpeechResult["rawMetrics"]);

      const analyzeResp = await fetch(new URL("/functions/v1/analyze-speech", supabaseUrl).toString(), {
        method: "POST",
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcription: transcribe.transcript,
          metrics,
        }),
      });

      if (!analyzeResp.ok) {
        const t = await analyzeResp.text();
        console.error("analyze-speech error:", analyzeResp.status, t);
        throw new Error(`analyze-speech failed: ${analyzeResp.status}`);
      }

      analyze = (await analyzeResp.json()) as AnalyzeSpeechResult;

      const { error: scoreError } = await supabase
        .from("practice_scores")
        .insert({
          take_id: takeRow.id,
          overall_score: analyze.score,
          metrics: {
            ...analyze.rawMetrics,
            ...analyze.metrics,
            transcript_confidence: transcribe.confidence,
            words_per_minute: transcribe.wordsPerMinute,
          },
        });

      if (scoreError) throw scoreError;
    }

    return json({
      takeId: takeRow.id,
      transcript: transcribe,
      analyze,
    });
  } catch (error) {
    console.error("Error in practice-ingest:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, { status: 500 });
  }
});
