-- Adds normalized tables for practice sessions, takes (audio), transcripts, and scores.

BEGIN;

-- Practice sessions group multiple takes for a lesson/category.
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  category text,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_lesson_id ON public.practice_sessions(lesson_id);

-- Each take is one recorded audio attempt.
CREATE TABLE IF NOT EXISTS public.practice_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  category text,
  item_index integer,
  audio_path text,
  audio_mime_type text,
  duration_seconds numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_takes_user_id ON public.practice_takes(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_takes_session_id ON public.practice_takes(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_takes_lesson_item ON public.practice_takes(lesson_id, category, item_index);

-- Transcript per take (Deepgram or other provider).
CREATE TABLE IF NOT EXISTS public.practice_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  take_id uuid NOT NULL REFERENCES public.practice_takes(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'deepgram',
  transcript text NOT NULL DEFAULT '',
  confidence numeric,
  words jsonb,
  raw jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_transcripts_take_id ON public.practice_transcripts(take_id);

-- Scores per take.
CREATE TABLE IF NOT EXISTS public.practice_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  take_id uuid NOT NULL REFERENCES public.practice_takes(id) ON DELETE CASCADE,
  overall_score integer,
  metrics jsonb,
  percent_c numeric,
  percent_r numeric,
  percent_i numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_scores_take_id ON public.practice_scores(take_id);

-- RLS
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_scores ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own data; admins/teachers can view.
CREATE POLICY "Users can insert own practice sessions"
  ON public.practice_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own practice sessions"
  ON public.practice_sessions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

CREATE POLICY "Users can update own practice sessions"
  ON public.practice_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own practice takes"
  ON public.practice_takes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own practice takes"
  ON public.practice_takes FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
  );

CREATE POLICY "Users can insert own practice transcripts"
  ON public.practice_transcripts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practice_takes t
      WHERE t.id = practice_transcripts.take_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own practice transcripts"
  ON public.practice_transcripts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practice_takes t
      WHERE t.id = practice_transcripts.take_id
        AND (
          t.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'teacher'::public.app_role)
        )
    )
  );

CREATE POLICY "Users can insert own practice scores"
  ON public.practice_scores FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practice_takes t
      WHERE t.id = practice_scores.take_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own practice scores"
  ON public.practice_scores FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practice_takes t
      WHERE t.id = practice_scores.take_id
        AND (
          t.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'teacher'::public.app_role)
        )
    )
  );

COMMIT;
