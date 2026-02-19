import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");
    if (!deepgramApiKey) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    const contentType = req.headers.get("content-type") ?? "";

    let audioBytes: Uint8Array;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File | null;

      if (!audioFile) {
        return json({ error: "No audio file provided" }, { status: 400 });
      }

      mimeType = audioFile.type || "audio/webm";
      audioBytes = new Uint8Array(await audioFile.arrayBuffer());
    } else {
      const { audio, mimeType: bodyMimeType } = (await req.json()) as {
        audio?: string;
        mimeType?: string;
      };

      if (!audio) {
        return json({ error: "No audio data provided" }, { status: 400 });
      }

      mimeType = bodyMimeType || "audio/webm";
      audioBytes = decodeBase64(audio);
    }

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&punctuate=true&filler_words=false&numerals=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": mimeType,
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

    return json({
      transcript,
      confidence,
      duration,
      words,
      wordCount,
      wordsPerMinute: duration > 0 ? Math.round((wordCount / duration) * 60) : 0,
    });
  } catch (error) {
    console.error("Error in deepgram-transcribe:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, { status: 500 });
  }
});
