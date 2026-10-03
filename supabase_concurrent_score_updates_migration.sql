-- Apply this migration to an existing Supabase project.
-- Score changes are deltas, so both referees can update the same match safely.

CREATE OR REPLACE FUNCTION public.adjust_match_score(
  p_slot_id INTEGER,
  p_side TEXT,
  p_delta INTEGER
)
RETURNS TABLE (
  slot_id INTEGER,
  tournament_match_id UUID,
  score_a INTEGER,
  score_b INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  updated_slot public.match_slots%ROWTYPE;
BEGIN
  IF p_side NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid score side: %', p_side;
  END IF;

  UPDATE public.match_slots
  SET score_a = CASE WHEN p_side = 'A' THEN GREATEST(0, public.match_slots.score_a + p_delta) ELSE public.match_slots.score_a END,
      score_b = CASE WHEN p_side = 'B' THEN GREATEST(0, public.match_slots.score_b + p_delta) ELSE public.match_slots.score_b END
  WHERE match_slots.slot_id = p_slot_id
  RETURNING match_slots.* INTO updated_slot;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match slot not found: %', p_slot_id;
  END IF;

  IF updated_slot.tournament_match_id IS NOT NULL THEN
    UPDATE public.tournament_matches
    SET score_a = updated_slot.score_a,
        score_b = updated_slot.score_b
    WHERE id = updated_slot.tournament_match_id;
  END IF;

  RETURN QUERY SELECT
    updated_slot.slot_id,
    updated_slot.tournament_match_id,
    updated_slot.score_a,
    updated_slot.score_b;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_match_score(INTEGER, TEXT, INTEGER) TO authenticated;
