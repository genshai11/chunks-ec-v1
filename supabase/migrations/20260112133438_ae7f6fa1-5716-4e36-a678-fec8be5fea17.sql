
-- Create course_classes table for reusable course instances
-- Course is the template (EREL), Class is an instance with specific schedule
CREATE TABLE public.course_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  class_code text NOT NULL,
  start_date date NOT NULL,
  schedule_days jsonb NOT NULL DEFAULT '["monday", "wednesday", "friday"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add class_id to enrollments (nullable for migration, users in old enrollments stay)
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.course_classes(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.course_classes ENABLE ROW LEVEL SECURITY;

-- Policies for course_classes
CREATE POLICY "Admins and teachers can manage classes"
ON public.course_classes
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "Users can view active classes"
ON public.course_classes
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

-- Update trigger for updated_at
CREATE TRIGGER update_course_classes_updated_at
BEFORE UPDATE ON public.course_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_course_classes_course_id ON public.course_classes(course_id);
CREATE INDEX idx_enrollments_class_id ON public.enrollments(class_id);

-- Comments
COMMENT ON TABLE public.course_classes IS 'Course class instances - allows reusing a course template for different class schedules';
COMMENT ON COLUMN public.course_classes.class_code IS 'Unique code for the class, e.g. EREL-2026-01';
COMMENT ON COLUMN public.course_classes.schedule_days IS 'Array of weekday names for lesson schedule';
COMMENT ON COLUMN public.enrollments.class_id IS 'Reference to specific class instance for deadline calculation';
