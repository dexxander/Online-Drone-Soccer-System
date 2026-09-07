-- Apply this migration in Supabase SQL Editor.
-- It makes match-result writes explicit for every authenticated admin or
-- active referee and restores the idempotent bracket-position constraint.

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS bracket_group_key INTEGER
  GENERATED ALWAYS AS (COALESCE(group_number, 0)) STORED;

DROP POLICY IF EXISTS "Admins can manage tournament matches" ON public.tournament_matches;
CREATE POLICY "Admins can manage tournament matches"
  ON public.tournament_matches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Referees can update tournament matches" ON public.tournament_matches;
CREATE POLICY "Referees can update tournament matches"
  ON public.tournament_matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'referee')
        AND users.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'referee')
        AND users.status = 'active'
    )
  );

-- This constraint is required by the client upsert used when a group stage
-- creates its knockout bracket. group_number separates otherwise-identical
-- group-stage slots while 0 is used for knockout rows.
DROP INDEX IF EXISTS public.tournament_matches_bracket_position_idx;
CREATE UNIQUE INDEX IF NOT EXISTS tournament_matches_bracket_position_idx
  ON public.tournament_matches
    (tournament_id, phase, round, slot, bracket_group_key);
