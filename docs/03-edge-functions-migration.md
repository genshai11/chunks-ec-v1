# 03 - Edge Functions Migration

## Functions to preserve
- `analyze-speech`
- `deepgram-transcribe`
- `practice-ingest`

## Deployment sequence
1. Set project link to new Supabase ref.
2. Set secrets:
   - `DEEPGRAM_API_KEY`
3. Deploy functions:
   - `supabase functions deploy analyze-speech`
   - `supabase functions deploy deepgram-transcribe`
   - `supabase functions deploy practice-ingest`

## Notes
- Keep function logic unchanged initially.
- Only update project/env references.
- `practice-ingest` depends on both database tables and `analyze-speech` endpoint.
