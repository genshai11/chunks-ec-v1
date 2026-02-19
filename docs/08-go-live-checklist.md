# 08 - Go-Live Checklist

## Security
- [ ] No secrets committed in git
- [ ] `DEEPGRAM_API_KEY` set only via Supabase secrets
- [ ] RLS enabled and tested with learner + teacher + admin accounts

## Backend
- [ ] All migrations applied to new project
- [ ] Edge functions deployed (`analyze-speech`, `deepgram-transcribe`, `practice-ingest`)
- [ ] Supabase types regenerated and committed

## Frontend
- [ ] `.env` points to new Supabase project
- [ ] Build passes (`npm run build`)
- [ ] Learner namespace `/app/*` tested
- [ ] Admin namespace `/admin*` tested
- [ ] Theme toggle verified in both light/dark

## Smoke Test Scenarios
- [ ] New user signup creates profile/wallet/default role
- [ ] Teacher can access admin area but not admin-only config tabs
- [ ] Admin can access all management tabs
- [ ] Practice submission stores take/transcript/score rows
- [ ] Leaderboard pages load without policy errors
