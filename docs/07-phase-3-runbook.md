# 07 - Phase 3 Execution Runbook

## Goal
Wire this refactor app to a **new Supabase project** and deploy schema + edge functions safely.

## Run Order (PowerShell)
From project root:

1. `./scripts/phase3/00-prereq-check.ps1`
2. `./scripts/phase3/01-link-project.ps1 -ProjectRef <NEW_PROJECT_REF>`
3. `./scripts/phase3/02-push-db.ps1`
4. `./scripts/phase3/03-set-secrets.ps1 -DeepgramApiKey <DEEPGRAM_KEY>`
5. `./scripts/phase3/04-deploy-functions.ps1`
6. `./scripts/phase3/05-generate-types.ps1`

## Frontend Env
Update `.env` from `.env.example` with the new project values:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Validation
- `npm run build`
- Login/signup works
- Learner routes under `/app/*` work
- Admin/Teacher routes under `/admin*` enforce role behavior
- Practice flow reaches `practice-ingest`
- Deepgram transcription returns transcript
- Leaderboards and progress queries return data

## CLI Note
If global Supabase CLI is not installed, scripts automatically use 
px supabase@latest.

