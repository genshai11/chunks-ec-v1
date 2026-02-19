-- Migration: Add bonus and deadline reward coin configuration entries
-- This adds 16 new coin_config entries for:
-- - Milestone bonuses (4 entries)
-- - Streak bonuses (3 entries)  
-- - First practice bonus (1 entry)
-- - Deadline rewards/penalties (8 entries)

BEGIN;

-- Milestone Bonuses (4 entries)
INSERT INTO public.coin_config (key, value, description) VALUES
  ('milestone_25_bonus', 10, 'Bonus coins awarded when lesson reaches 25% completion'),
  ('milestone_50_bonus', 25, 'Bonus coins awarded when lesson reaches 50% completion'),
  ('milestone_75_bonus', 50, 'Bonus coins awarded when lesson reaches 75% completion'),
  ('milestone_100_bonus', 100, 'Bonus coins awarded when lesson reaches 100% completion');

-- Streak Bonuses (3 entries)
INSERT INTO public.coin_config (key, value, description) VALUES
  ('streak_bonus_threshold', 3, 'Number of consecutive high scores needed to trigger streak bonus'),
  ('streak_bonus_min_score', 80, 'Minimum score required for a practice to count toward streak'),
  ('streak_bonus_coins', 5, 'Coins awarded for each streak threshold reached');

-- First Practice Bonus (1 entry)
INSERT INTO public.coin_config (key, value, description) VALUES
  ('first_practice_bonus', 2, 'Small bonus awarded when practicing an item for the first time');

-- Deadline Early Bonuses (3 entries)
INSERT INTO public.coin_config (key, value, description) VALUES
  ('deadline_early_bonus_max', 50, 'Maximum bonus for completing lesson well before deadline'),
  ('deadline_early_bonus_days', 3, 'Days before deadline to receive maximum early bonus'),
  ('deadline_on_time_bonus', 20, 'Bonus for completing lesson on the deadline day');

-- Deadline Penalties (3 entries)
INSERT INTO public.coin_config (key, value, description) VALUES
  ('deadline_penalty_max', 100, 'Maximum penalty for late completion with low progress'),
  ('deadline_penalty_grace_days', 0, 'Grace period (days) before penalties start after deadline'),
  ('deadline_penalty_scale_days', 7, 'Days after deadline to reach maximum penalty');

-- Deadline Completion Thresholds (2 entries)
INSERT INTO public.coin_config (key, value, description) VALUES
  ('min_completion_for_bonus', 80, 'Minimum completion percentage required to earn deadline bonuses'),
  ('penalty_completion_threshold', 50, 'Below this completion %, full penalty applies for late deadlines');

COMMIT;

-- Verification query (commented out - uncomment to check after running migration)
-- SELECT key, value, description FROM public.coin_config 
-- WHERE key LIKE 'milestone_%' 
--    OR key LIKE 'streak_%' 
--    OR key LIKE 'first_practice_%'
--    OR key LIKE 'deadline_%'
--    OR key LIKE '%_completion_%'
-- ORDER BY key;
