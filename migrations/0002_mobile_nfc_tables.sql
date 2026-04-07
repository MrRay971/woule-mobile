-- Table vehicle_sessions (pour l'app mobile NFC)
CREATE TABLE IF NOT EXISTS public.vehicle_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ambassador_id UUID NOT NULL REFERENCES public.ambassadeurs(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  nfc_tag_id TEXT,
  total_km NUMERIC(10,2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table gps_points (points GPS de l'app mobile)
CREATE TABLE IF NOT EXISTS public.gps_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.vehicle_sessions(id) ON DELETE CASCADE,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  speed NUMERIC(6,2) DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Colonne nfc_tag_id sur vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS nfc_tag_id TEXT;

-- Enable RLS
ALTER TABLE public.vehicle_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_points ENABLE ROW LEVEL SECURITY;

-- Policies pour vehicle_sessions
DROP POLICY IF EXISTS "ambassador_own_sessions" ON public.vehicle_sessions;
CREATE POLICY "ambassador_own_sessions" ON public.vehicle_sessions
  FOR ALL TO authenticated
  USING (ambassador_id IN (SELECT id FROM public.ambassadeurs WHERE profile_id = auth.uid()))
  WITH CHECK (ambassador_id IN (SELECT id FROM public.ambassadeurs WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "service_role_vehicle_sessions" ON public.vehicle_sessions;
CREATE POLICY "service_role_vehicle_sessions" ON public.vehicle_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies pour gps_points
DROP POLICY IF EXISTS "ambassador_own_gps" ON public.gps_points;
CREATE POLICY "ambassador_own_gps" ON public.gps_points
  FOR ALL TO authenticated
  USING (session_id IN (
    SELECT vs.id FROM public.vehicle_sessions vs
    JOIN public.ambassadeurs a ON a.id = vs.ambassador_id
    WHERE a.profile_id = auth.uid()
  ))
  WITH CHECK (session_id IN (
    SELECT vs.id FROM public.vehicle_sessions vs
    JOIN public.ambassadeurs a ON a.id = vs.ambassador_id
    WHERE a.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "service_role_gps_points" ON public.gps_points;
CREATE POLICY "service_role_gps_points" ON public.gps_points
  FOR ALL TO service_role USING (true) WITH CHECK (true);
