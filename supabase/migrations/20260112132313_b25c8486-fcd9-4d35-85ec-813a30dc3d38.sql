-- Add schedule_days to courses (array of weekdays like ["monday", "wednesday", "friday"])
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS schedule_days jsonb DEFAULT '["monday", "wednesday", "friday"]'::jsonb;

-- Add personal start_date to enrollments (each student can have different start date)
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS start_date date DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.courses.schedule_days IS 'Array of weekday names for lesson schedule, e.g. ["monday", "wednesday", "friday"]';
COMMENT ON COLUMN public.enrollments.start_date IS 'Student personal start date for calculating lesson deadlines';