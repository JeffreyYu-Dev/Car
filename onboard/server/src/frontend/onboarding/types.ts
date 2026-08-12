export interface DriverProfileData {
  name: string;
  age: number;
  license_type: "learner" | "intermediate" | "full";
  years_experience: "<1" | "1-3" | "3-10" | "10+";
  mechanical_actions: string[];
  preferred_guidance_style: "safety_only" | "technical" | "both";
  physical_limitations: string[];
  physical_limitations_other: string;
  maintenance_relationship?: "diy" | "mechanic" | "mix";
}

export const LICENSE_TYPE_OPTIONS = [
  { value: "learner", label: "Learner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "full", label: "Full" },
] as const;

export const YEARS_EXPERIENCE_OPTIONS = [
  { value: "<1", label: "Less than 1 year" },
  { value: "1-3", label: "1–3 years" },
  { value: "3-10", label: "3–10 years" },
  { value: "10+", label: "10+ years" },
] as const;

export const MECHANICAL_ACTION_OPTIONS = [
  { value: "fluids", label: "Checked or topped up fluids" },
  { value: "oil_change", label: "Changed the oil" },
  { value: "filter_or_wipers", label: "Replaced an air filter or wiper blades" },
  { value: "brake_pads", label: "Replaced brake pads" },
  { value: "jump_start", label: "Jump-started a battery" },
  {
    value: "advanced_repair",
    label: "Diagnosed or repaired something more involved (e.g. fuel pump, suspension)",
  },
  { value: "none", label: "None of these" },
] as const;

export const GUIDANCE_STYLE_OPTIONS = [
  { value: "safety_only", label: "Just tell me if it's safe to keep driving" },
  { value: "technical", label: "Give me the technical details so I can look at it myself" },
  { value: "both", label: "A bit of both, depending on how serious it is" },
] as const;

export const PHYSICAL_LIMITATION_OPTIONS = [
  { value: "lifting", label: "Difficulty lifting heavy items" },
  { value: "vision", label: "Vision limitations" },
  { value: "mobility", label: "Mobility or back limitations" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const MAINTENANCE_RELATIONSHIP_OPTIONS = [
  { value: "diy", label: "I do it myself" },
  { value: "mechanic", label: "I take it to a mechanic" },
  { value: "mix", label: "A mix" },
] as const;
