# Deepgram setup (chunks-economy)

This repo uses a Supabase Edge Function (`deepgram-transcribe`) to transcribe recorded speech via Deepgram.

## 1) Set the secret in Supabase

You need to set `DEEPGRAM_API_KEY` as a **Supabase Edge Function secret**.

Using Supabase CLI:

```bash
supabase secrets set DEEPGRAM_API_KEY=dg_...
```

Or via dashboard:
- Project Settings → Edge Functions → Manage secrets

## 2) Deploy the function

```bash
supabase functions deploy deepgram-transcribe
```

## 3) Client usage

The frontend calls:

- `supabase.functions.invoke('deepgram-transcribe', { body: { audio: base64 } })` (JSON base64)
- OR `supabase.functions.invoke('deepgram-transcribe', { body: FormData(...) })` (multipart)

The function responds with:
- `transcript`, `confidence`, `duration`, `words[]`, `wordCount`, `wordsPerMinute`

## Notes

- Do not commit `.env` with Supabase keys; use `.env.example`.
- Deepgram key should never be stored in the client.
