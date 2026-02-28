-- ============================================================
-- Profile enhancements: activity tracking + signup attribution
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sign_in_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_referrer text;

CREATE INDEX IF NOT EXISTS idx_profiles_last_sign_in_at
  ON public.profiles(last_sign_in_at DESC NULLS LAST);

-- RPC for atomic sign-in count increment
CREATE OR REPLACE FUNCTION increment_sign_in_count(uid uuid)
RETURNS void AS $$
  UPDATE profiles
  SET sign_in_count = COALESCE(sign_in_count, 0) + 1,
      last_sign_in_at = now()
  WHERE id = uid;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;

-- Update handle_new_user trigger to capture auth_provider + signup_referrer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, auth_provider, signup_referrer)
  VALUES (
    new.id,
    public.generate_unique_username(new.email),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'provider', 'email'),
    new.raw_user_meta_data->>'signup_referrer'
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_provider = COALESCE(EXCLUDED.auth_provider, profiles.auth_provider),
    signup_referrer = COALESCE(EXCLUDED.signup_referrer, profiles.signup_referrer);
  RETURN new;
END;
$$;

-- ============================================================
-- Lightweight events table for feature usage tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON public.events(event_name, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_insert_service_role ON public.events
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY events_select_own ON public.events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
