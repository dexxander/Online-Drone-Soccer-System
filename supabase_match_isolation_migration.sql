-- Apply this migration to an existing Supabase project.
-- It prevents reusable court slots from sharing child records between matches.

ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.tournament_matches(id) ON DELETE CASCADE;

ALTER TABLE public.penalties
  ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.tournament_matches(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Referees can delete match events" ON public.match_events;
CREATE POLICY "Referees can delete match events"
  ON public.match_events FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('referee', 'admin')
  ));

DROP POLICY IF EXISTS "Referees can delete penalties" ON public.penalties;
CREATE POLICY "Referees can delete penalties"
  ON public.penalties FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('referee', 'admin')
  ));

DROP POLICY IF EXISTS "Admins and referees can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins and referees can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'referee')
  ));
