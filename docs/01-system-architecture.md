# 01 - System Architecture

## Stack
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- Backend: Supabase Postgres + Auth + RLS + Edge Functions
- Audio: Deepgram via edge function

## App Domains
- Learner: dashboard, courses, practice, progress, leaderboard, profile
- Admin/Staff: courses, classes, lessons, users, scoring, coin config

## Security
- Authentication by Supabase Auth
- Authorization by `user_roles` + RLS policies
- Edge functions use forwarded Authorization header for RLS-aware access
