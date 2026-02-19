# 02 - Database Migration (New Supabase Project)

## Goal
Recreate schema, RLS, triggers, and RPCs in a new Supabase project.

## Source of truth
- `supabase/migrations/*.sql`

## Steps
1. Create a new Supabase project.
2. Update `supabase/config.toml` with new `project_id`.
3. Run:
   - `supabase link --project-ref <NEW_PROJECT_REF>`
   - `supabase db push`
4. Verify key objects:
   - `user_roles`, `profiles`, `courses`, `lessons`, `enrollments`
   - `practice_sessions`, `practice_takes`, `practice_transcripts`, `practice_scores`
   - functions: `has_role`, `get_user_role`, leaderboard RPCs

## Post-migration checks
- RLS enabled on all tables
- trigger `on_auth_user_created` exists
- default role assignment works on signup
