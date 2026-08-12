/**
 * People self-rate mechanical skill inconsistently, so we never ask for a
 * skill level directly. Instead we derive it from which concrete tasks the
 * driver says they've done themselves.
 */
export function deriveSelfRatedProficiency(
  actions: string[],
): "novice" | "basic" | "intermediate" | "advanced" {
  if (actions.includes("advanced_repair")) return "advanced";
  if (actions.length === 0 || actions.includes("none")) return "novice";
  if (actions.length >= 3) return "intermediate";
  return "basic";
}
