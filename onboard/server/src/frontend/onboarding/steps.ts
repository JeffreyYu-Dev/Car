import type { OnboardingStep } from "@onboardjs/react";

export interface StepMeta {
  id: string;
  title: string;
  description?: string;
  /** Optional steps can be skipped and backfilled later; they don't block a usable profile. */
  isSkippable?: boolean;
}

export const STEPS: StepMeta[] = [
  {
    id: "name",
    title: "What's your name?",
  },
  {
    id: "age",
    title: "What's your age?",
  },
  {
    id: "license_type",
    title: "What kind of license do you hold?",
  },
  {
    id: "years_experience",
    title: "How many years have you been driving?",
  },
  {
    id: "mechanical_proficiency",
    title: "Which of these have you done yourself, without a mechanic?",
    description: "Select everything that applies.",
  },
  {
    id: "guidance_style",
    title:
      "When something's wrong with your car, what do you actually want to know?",
  },
  {
    id: "physical_limitations",
    title:
      "Is there anything that affects what car maintenance you can physically do?",
    description: "Optional and skippable — select all that apply.",
  },
  {
    id: "maintenance_relationship",
    title: "How do you usually handle car maintenance?",
    description:
      "Optional — this can be filled in later as you use the app.",
    isSkippable: true,
  },
  {
    id: "summary",
    title: "Review your profile",
  },
];

export const ENGINE_STEPS: OnboardingStep[] = [
  { id: "name", type: "INFORMATION" },
  { id: "age", type: "INFORMATION" },
  { id: "license_type", type: "INFORMATION" },
  { id: "years_experience", type: "INFORMATION" },
  { id: "mechanical_proficiency", type: "INFORMATION" },
  { id: "guidance_style", type: "INFORMATION" },
  { id: "physical_limitations", type: "INFORMATION" },
  {
    id: "maintenance_relationship",
    type: "INFORMATION",
    isSkippable: true,
    skipToStep: null,
  },
  { id: "summary", type: "INFORMATION" },
];
