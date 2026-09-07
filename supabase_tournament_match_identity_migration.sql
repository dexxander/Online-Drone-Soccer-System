-- Make tournament bracket generation idempotent across concurrent referees.
-- Apply this migration once to an existing Supabase project.

-- Group-stage slots restart at 0 inside each group, so group_number must be
-- part of the logical bracket position. The generated key maps NULL knockout
-- groups to 0 while preserving distinct group-stage slots.
DROP INDEX IF EXISTS public.tournament_matches_bracket_position_idx;
ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS bracket_group_key INTEGER
  GENERATED ALWAYS AS (COALESCE(group_number, 0)) STORED;

-- Older versions could create duplicate rows when multiple referee tabs
-- generated the knockout bracket from the same completed group stage. Keep one
-- canonical row for each logical bracket position before adding the constraint.
CREATE TEMP TABLE tournament_match_canonical_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY tournament_id, phase, round, slot, COALESCE(group_number, 0)
      ORDER BY (winner_id IS NOT NULL) DESC, id
    ) AS canonical_id,
    row_number() OVER (
      PARTITION BY tournament_id, phase, round, slot, COALESCE(group_number, 0)
      ORDER BY (winner_id IS NOT NULL) DESC, id
    ) AS row_number
  FROM public.tournament_matches
  WHERE tournament_id IS NOT NULL
)
SELECT id AS duplicate_id, canonical_id
FROM ranked
WHERE row_number > 1;

-- Preserve any court/event/penalty records that happen to point at a
-- duplicate before removing the duplicate tournament match.
UPDATE public.match_slots AS slot
SET tournament_match_id = map.canonical_id
FROM tournament_match_canonical_map AS map
WHERE slot.tournament_match_id = map.duplicate_id;

UPDATE public.match_events AS event
SET match_id = map.canonical_id
FROM tournament_match_canonical_map AS map
WHERE event.match_id = map.duplicate_id;

UPDATE public.penalties AS penalty
SET match_id = map.canonical_id
FROM tournament_match_canonical_map AS map
WHERE penalty.match_id = map.duplicate_id;

DELETE FROM public.mock_battles AS battle
USING tournament_match_canonical_map AS map
WHERE battle.id = map.duplicate_id;

DELETE FROM public.tournament_matches AS duplicate
USING tournament_match_canonical_map AS map
WHERE duplicate.id = map.duplicate_id;

CREATE UNIQUE INDEX IF NOT EXISTS tournament_matches_bracket_position_idx
  ON public.tournament_matches (tournament_id, phase, round, slot, bracket_group_key)
  WHERE tournament_id IS NOT NULL;
