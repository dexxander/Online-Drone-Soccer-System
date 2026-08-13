-- Shared referee mock-battle history.
-- Run once in Supabase SQL Editor for an existing project.

CREATE TABLE IF NOT EXISTS public.mock_battles (
  id UUID PRIMARY KEY REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  red_team_name TEXT NOT NULL DEFAULT 'Red Team',
  blue_team_name TEXT NOT NULL DEFAULT 'Blue Team',
  created_by TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

ALTER TABLE public.mock_battles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mock battles are viewable by referees" ON public.mock_battles;
CREATE POLICY "Mock battles are viewable by referees"
  ON public.mock_battles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('referee', 'admin')
  ));

DROP POLICY IF EXISTS "Referees can create mock battles" ON public.mock_battles;
CREATE POLICY "Referees can create mock battles"
  ON public.mock_battles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('referee', 'admin')
  ));

DROP POLICY IF EXISTS "Referees can insert mock tournament matches" ON public.tournament_matches;
CREATE POLICY "Referees can insert mock tournament matches"
  ON public.tournament_matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('referee', 'admin')
    )
  );
