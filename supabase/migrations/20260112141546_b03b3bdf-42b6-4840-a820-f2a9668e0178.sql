-- Public leaderboard data should be visible to all authenticated users without exposing raw practice history rows.
-- We provide SECURITY DEFINER RPCs that return only aggregated, non-sensitive fields.

-- 1) Global / course / class score leaderboard
CREATE OR REPLACE FUNCTION public.get_score_leaderboard(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_course_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total_score integer,
  practice_count integer,
  avg_score integer,
  coins integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped_users AS (
    -- If class_id is provided: all enrolled in that class
    SELECT e.user_id
    FROM public.enrollments e
    WHERE p_class_id IS NOT NULL
      AND e.class_id = p_class_id
      AND e.status = 'active'

    UNION

    -- Else if course_id is provided: all enrolled in that course
    SELECT e.user_id
    FROM public.enrollments e
    WHERE p_class_id IS NULL
      AND p_course_id IS NOT NULL
      AND e.course_id = p_course_id
      AND e.status = 'active'

    UNION

    -- Else global: all users who have practiced at least once
    SELECT ph.user_id
    FROM public.practice_history ph
    WHERE p_class_id IS NULL
      AND p_course_id IS NULL
    GROUP BY ph.user_id
  ),
  agg_practice AS (
    SELECT ph.user_id,
           COALESCE(SUM(ph.score), 0)::integer AS total_score,
           COUNT(*)::integer AS practice_count,
           CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(ph.score))::integer ELSE 0 END AS avg_score
    FROM public.practice_history ph
    JOIN scoped_users su ON su.user_id = ph.user_id
    GROUP BY ph.user_id
  ),
  base AS (
    SELECT su.user_id,
           COALESCE(p.display_name, 'Anonymous') AS display_name,
           p.avatar_url,
           COALESCE(ap.total_score, 0)::integer AS total_score,
           COALESCE(ap.practice_count, 0)::integer AS practice_count,
           COALESCE(ap.avg_score, 0)::integer AS avg_score,
           COALESCE(w.balance, 0)::integer AS coins
    FROM scoped_users su
    LEFT JOIN public.profiles p ON p.id = su.user_id
    LEFT JOIN agg_practice ap ON ap.user_id = su.user_id
    LEFT JOIN public.user_wallets w ON w.user_id = su.user_id
  )
  SELECT b.user_id,
         b.display_name,
         b.avatar_url,
         b.total_score,
         b.practice_count,
         b.avg_score,
         b.coins
  FROM base b
  WHERE (
    -- for global leaderboards we only include people with practice
    (p_class_id IS NULL AND p_course_id IS NULL AND b.practice_count > 0)
    OR
    -- for course/class leaderboards show all enrolled users (including 0)
    (p_class_id IS NOT NULL OR p_course_id IS NOT NULL)
  )
  ORDER BY b.total_score DESC, b.practice_count DESC, b.display_name ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;

REVOKE ALL ON FUNCTION public.get_score_leaderboard(integer, integer, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_score_leaderboard(integer, integer, uuid, uuid) TO authenticated;


-- 2) Streak leaderboard (daily_streaks is private by RLS, so expose only aggregated streak fields)
CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  current_streak integer,
  longest_streak integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ds.user_id,
         COALESCE(p.display_name, 'Anonymous') AS display_name,
         p.avatar_url,
         ds.current_streak::integer,
         ds.longest_streak::integer
  FROM public.daily_streaks ds
  LEFT JOIN public.profiles p ON p.id = ds.user_id
  ORDER BY ds.current_streak DESC, ds.longest_streak DESC, ds.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

REVOKE ALL ON FUNCTION public.get_streak_leaderboard(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_streak_leaderboard(integer, integer) TO authenticated;
