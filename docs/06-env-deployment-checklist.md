# 06 - Environment and Deployment Checklist

## Environment
- `.env` (frontend): Supabase URL + anon key + project ID
- Supabase secrets: Deepgram key for edge functions

## Deployment order
1. Database migrations
2. Edge function secrets
3. Edge function deploy
4. Frontend deploy with new env

## Smoke tests
- signup/signin
- role-based routing (learner/teacher/admin)
- lesson loading + practice submit
- transcription + scoring pipeline
- leaderboard and progress read paths
