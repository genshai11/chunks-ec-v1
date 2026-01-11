-- Create daily_streaks table for tracking user streaks
CREATE TABLE public.daily_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_practice_date DATE,
  streak_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on daily_streaks
ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_streaks
CREATE POLICY "Users can view their own streak"
  ON public.daily_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
  ON public.daily_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
  ON public.daily_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Create badges table for available badges
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'trophy',
  category TEXT NOT NULL DEFAULT 'achievement',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on badges (public read)
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (true);

-- Create user_badges table for earned badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS on user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on daily_streaks
CREATE TRIGGER update_daily_streaks_updated_at
  BEFORE UPDATE ON public.daily_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default badges
INSERT INTO public.badges (name, description, icon, category, requirement_type, requirement_value, coins_reward, rarity) VALUES
('First Steps', 'Complete your first practice session', 'footprints', 'beginner', 'practice_count', 1, 10, 'common'),
('Dedicated Learner', 'Complete 10 practice sessions', 'book-open', 'practice', 'practice_count', 10, 25, 'common'),
('Practice Pro', 'Complete 50 practice sessions', 'graduation-cap', 'practice', 'practice_count', 50, 100, 'rare'),
('Century Club', 'Complete 100 practice sessions', 'medal', 'practice', 'practice_count', 100, 250, 'epic'),
('Perfectionist', 'Score 100% on a practice', 'star', 'score', 'perfect_score', 1, 50, 'rare'),
('High Achiever', 'Score 90%+ on 10 practices', 'target', 'score', 'high_scores', 10, 75, 'rare'),
('Week Warrior', 'Maintain a 7-day streak', 'flame', 'streak', 'streak_days', 7, 50, 'uncommon'),
('Month Master', 'Maintain a 30-day streak', 'fire', 'streak', 'streak_days', 30, 200, 'epic'),
('Vocabulary Virtuoso', 'Master 25 vocabulary items', 'book', 'mastery', 'vocab_mastered', 25, 100, 'rare'),
('Coin Collector', 'Earn 500 total coins', 'coins', 'coins', 'total_coins', 500, 50, 'uncommon'),
('Wealthy Learner', 'Earn 2000 total coins', 'gem', 'coins', 'total_coins', 2000, 150, 'epic'),
('Early Bird', 'Practice before 8 AM', 'sunrise', 'special', 'early_practice', 1, 25, 'uncommon'),
('Night Owl', 'Practice after 10 PM', 'moon', 'special', 'late_practice', 1, 25, 'uncommon'),
('Speed Demon', 'Complete 5 practices in one day', 'zap', 'special', 'daily_practices', 5, 75, 'rare'),
('Top 10', 'Reach top 10 on leaderboard', 'trophy', 'leaderboard', 'leaderboard_rank', 10, 100, 'epic');

-- Enable realtime for competitive features
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_streaks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;