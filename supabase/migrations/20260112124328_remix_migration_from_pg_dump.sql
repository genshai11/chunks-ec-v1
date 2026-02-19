CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'teacher',
    'user'
);


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'teacher' THEN 2 
      WHEN 'user' THEN 3 
    END
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Create wallet with 0 balance
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (NEW.id, 0);
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    icon text DEFAULT 'trophy'::text NOT NULL,
    category text DEFAULT 'achievement'::text NOT NULL,
    requirement_type text NOT NULL,
    requirement_value integer DEFAULT 1 NOT NULL,
    coins_reward integer DEFAULT 0 NOT NULL,
    rarity text DEFAULT 'common'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coin_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coin_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value integer NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coin_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coin_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    transaction_type text NOT NULL,
    description text,
    reference_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    start_date date,
    created_by uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_streaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_streaks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_streak integer DEFAULT 0 NOT NULL,
    longest_streak integer DEFAULT 0 NOT NULL,
    last_practice_date date,
    streak_start_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    lesson_name text NOT NULL,
    lesson_file text,
    categories jsonb DEFAULT '{}'::jsonb NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    deadline_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: practice_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    category text NOT NULL,
    item_index integer NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    coins_earned integer DEFAULT 0 NOT NULL,
    audio_url text,
    metrics jsonb,
    practiced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scoring_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    weight numeric DEFAULT 0.2 NOT NULL,
    min_value numeric,
    max_value numeric,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    category text NOT NULL,
    item_index integer NOT NULL,
    mastery_level integer DEFAULT 0 NOT NULL,
    best_score integer DEFAULT 0 NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_practiced_at timestamp with time zone
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    total_earned integer DEFAULT 0 NOT NULL,
    total_spent integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: badges badges_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_name_key UNIQUE (name);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: coin_config coin_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_config
    ADD CONSTRAINT coin_config_key_key UNIQUE (key);


--
-- Name: coin_config coin_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_config
    ADD CONSTRAINT coin_config_pkey PRIMARY KEY (id);


--
-- Name: coin_transactions coin_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_transactions
    ADD CONSTRAINT coin_transactions_pkey PRIMARY KEY (id);


--
-- Name: courses courses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_key UNIQUE (code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: daily_streaks daily_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_streaks
    ADD CONSTRAINT daily_streaks_pkey PRIMARY KEY (id);


--
-- Name: daily_streaks daily_streaks_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_streaks
    ADD CONSTRAINT daily_streaks_user_id_key UNIQUE (user_id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: practice_history practice_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_history
    ADD CONSTRAINT practice_history_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: scoring_config scoring_config_metric_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_config
    ADD CONSTRAINT scoring_config_metric_name_key UNIQUE (metric_name);


--
-- Name: scoring_config scoring_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_config
    ADD CONSTRAINT scoring_config_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_user_id_badge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);


--
-- Name: user_progress user_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_pkey PRIMARY KEY (id);


--
-- Name: user_progress user_progress_user_id_lesson_id_category_item_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_user_id_lesson_id_category_item_index_key UNIQUE (user_id, lesson_id, category, item_index);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_wallets user_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (id);


--
-- Name: user_wallets user_wallets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_key UNIQUE (user_id);


--
-- Name: courses update_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: daily_streaks update_daily_streaks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_daily_streaks_updated_at BEFORE UPDATE ON public.daily_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: lessons update_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: user_wallets update_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.user_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: coin_transactions coin_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_transactions
    ADD CONSTRAINT coin_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: courses courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: practice_history practice_history_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_history
    ADD CONSTRAINT practice_history_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: practice_history practice_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_history
    ADD CONSTRAINT practice_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE;


--
-- Name: user_progress user_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: user_progress user_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_progress
    ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_wallets user_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: courses Admins and teachers can manage courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and teachers can manage courses" ON public.courses TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: lessons Admins and teachers can manage lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and teachers can manage lessons" ON public.lessons TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: coin_config Admins can manage coin config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage coin config" ON public.coin_config TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: enrollments Admins can manage enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage enrollments" ON public.enrollments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: scoring_config Admins can manage scoring config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage scoring config" ON public.scoring_config TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courses Anyone can view active courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active courses" ON public.courses FOR SELECT TO authenticated USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: badges Anyone can view badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);


--
-- Name: coin_config Anyone can view coin config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view coin config" ON public.coin_config FOR SELECT TO authenticated USING (true);


--
-- Name: scoring_config Anyone can view scoring config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view scoring config" ON public.scoring_config FOR SELECT TO authenticated USING (true);


--
-- Name: lessons Enrolled users can view lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enrolled users can view lessons" ON public.lessons FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.enrollments e
  WHERE ((e.course_id = lessons.course_id) AND (e.user_id = auth.uid())))) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: coin_transactions System can insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert transactions" ON public.coin_transactions FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_wallets System can manage wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage wallets" ON public.user_wallets TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: enrollments Users can enroll themselves; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: practice_history Users can insert own practice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own practice" ON public.practice_history FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: user_badges Users can insert their own badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own badges" ON public.user_badges FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_streaks Users can insert their own streak; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own streak" ON public.daily_streaks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_progress Users can manage own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own progress" ON public.user_progress TO authenticated USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: daily_streaks Users can update their own streak; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own streak" ON public.daily_streaks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: enrollments Users can view own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: practice_history Users can view own practice history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own practice history" ON public.practice_history FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: user_progress Users can view own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'teacher'::public.app_role)));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: coin_transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON public.coin_transactions FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_wallets Users can view own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own wallet" ON public.user_wallets FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_badges Users can view their own badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own badges" ON public.user_badges FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_streaks Users can view their own streak; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own streak" ON public.daily_streaks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

--
-- Name: coin_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coin_config ENABLE ROW LEVEL SECURITY;

--
-- Name: coin_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_streaks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: practice_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.practice_history ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: scoring_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;

--
-- Name: user_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: user_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;