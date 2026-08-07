import type { Penalty } from "./types";

export type EffectivePenaltyBadge = "Warning" | "Yellow";

/**
 * Two warnings become one yellow card; two yellow cards become a red card.
 * A red card disqualifies the team and is represented by isDisqualified.
 */
export function calculateEffectivePenalties(penalties: Penalty[]) {
  const warnings = penalties.filter((penalty) => penalty.type === "Minor").length;
  const yellows = penalties.filter((penalty) => penalty.type === "Major").length;
  const reds = penalties.filter((penalty) => penalty.type === "Technical").length;

  const totalYellows = yellows + Math.floor(warnings / 2);
  const effectiveWarnings = warnings % 2;
  const effectiveYellows = totalYellows % 2;
  const effectiveReds = reds + Math.floor(totalYellows / 2);

  return {
    badges: [
      ...Array.from({ length: effectiveYellows }, () => "Yellow" as const),
      ...Array.from({ length: effectiveWarnings }, () => "Warning" as const),
    ] as EffectivePenaltyBadge[],
    isDisqualified: effectiveReds > 0,
  };
}
