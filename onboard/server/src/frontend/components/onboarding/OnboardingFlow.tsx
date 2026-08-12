import { useState, type Dispatch, type SetStateAction } from "react";
import { OnboardingProvider, useOnboarding } from "@onboardjs/react";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Progress } from "@/frontend/components/ui/progress";
import { deriveSelfRatedProficiency } from "@/frontend/onboarding/derive";
import { ENGINE_STEPS, STEPS } from "@/frontend/onboarding/steps";
import {
  GUIDANCE_STYLE_OPTIONS,
  LICENSE_TYPE_OPTIONS,
  MAINTENANCE_RELATIONSHIP_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
  type DriverProfileData,
} from "@/frontend/onboarding/types";
import { SingleChoiceField } from "./fields/SingleChoiceField";
import { AgeStep } from "./steps/AgeStep";
import { MechanicalProficiencyStep } from "./steps/MechanicalProficiencyStep";
import { NameStep } from "./steps/NameStep";
import { PhysicalLimitationsStep } from "./steps/PhysicalLimitationsStep";
import { SummaryStep } from "./steps/SummaryStep";

type Answers = Partial<DriverProfileData>;
type SetAnswers = Dispatch<SetStateAction<Answers>>;

const INITIAL_ANSWERS: Answers = {
  mechanical_actions: [],
  physical_limitations: [],
  physical_limitations_other: "",
};

function isStepValid(stepId: string, answers: Answers): boolean {
  switch (stepId) {
    case "name":
      return !!answers.name?.trim();
    case "age":
      return (
        typeof answers.age === "number" &&
        answers.age >= 14 &&
        answers.age <= 110
      );
    case "license_type":
      return !!answers.license_type;
    case "years_experience":
      return !!answers.years_experience;
    case "mechanical_proficiency":
      return (answers.mechanical_actions?.length ?? 0) > 0;
    case "guidance_style":
      return !!answers.preferred_guidance_style;
    default:
      return true;
  }
}

function renderField(stepId: string, answers: Answers, setAnswers: SetAnswers) {
  switch (stepId) {
    case "name":
      return (
        <NameStep
          value={answers.name}
          onChange={(name) => setAnswers((a) => ({ ...a, name }))}
        />
      );
    case "age":
      return (
        <AgeStep
          value={answers.age}
          onChange={(age) => setAnswers((a) => ({ ...a, age }))}
        />
      );
    case "license_type":
      return (
        <SingleChoiceField
          name="license-type"
          options={LICENSE_TYPE_OPTIONS}
          value={answers.license_type}
          onChange={(license_type) =>
            setAnswers((a) => ({
              ...a,
              license_type: license_type as DriverProfileData["license_type"],
            }))
          }
        />
      );
    case "years_experience":
      return (
        <SingleChoiceField
          name="years-experience"
          options={YEARS_EXPERIENCE_OPTIONS}
          value={answers.years_experience}
          onChange={(years_experience) =>
            setAnswers((a) => ({
              ...a,
              years_experience:
                years_experience as DriverProfileData["years_experience"],
            }))
          }
        />
      );
    case "mechanical_proficiency":
      return (
        <MechanicalProficiencyStep
          value={answers.mechanical_actions ?? []}
          onChange={(mechanical_actions) =>
            setAnswers((a) => ({ ...a, mechanical_actions }))
          }
        />
      );
    case "guidance_style":
      return (
        <SingleChoiceField
          name="guidance-style"
          options={GUIDANCE_STYLE_OPTIONS}
          value={answers.preferred_guidance_style}
          onChange={(preferred_guidance_style) =>
            setAnswers((a) => ({
              ...a,
              preferred_guidance_style:
                preferred_guidance_style as DriverProfileData["preferred_guidance_style"],
            }))
          }
        />
      );
    case "physical_limitations":
      return (
        <PhysicalLimitationsStep
          value={answers.physical_limitations ?? []}
          other={answers.physical_limitations_other ?? ""}
          onChange={(physical_limitations) =>
            setAnswers((a) => ({ ...a, physical_limitations }))
          }
          onOtherChange={(physical_limitations_other) =>
            setAnswers((a) => ({ ...a, physical_limitations_other }))
          }
        />
      );
    case "maintenance_relationship":
      return (
        <SingleChoiceField
          name="maintenance-relationship"
          options={MAINTENANCE_RELATIONSHIP_OPTIONS}
          value={answers.maintenance_relationship}
          onChange={(maintenance_relationship) =>
            setAnswers((a) => ({
              ...a,
              maintenance_relationship:
                maintenance_relationship as DriverProfileData["maintenance_relationship"],
            }))
          }
        />
      );
    case "summary":
      return <SummaryStep answers={answers} />;
    default:
      return null;
  }
}

async function submitProfile(answers: Answers) {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: answers.name,
      age: answers.age,
      licenseType: answers.license_type,
      yearsExperience: answers.years_experience,
      mechanicalActions: answers.mechanical_actions ?? [],
      selfRatedProficiency: deriveSelfRatedProficiency(
        answers.mechanical_actions ?? [],
      ),
      preferredGuidanceStyle: answers.preferred_guidance_style,
      physicalLimitations: answers.physical_limitations ?? [],
      physicalLimitationsOther: answers.physical_limitations_other || null,
      maintenanceRelationship: answers.maintenance_relationship ?? null,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to save profile");
  }
}

function DoneCard({ onContinue }: { onContinue: () => void }) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>You're all set</CardTitle>
        <CardDescription>
          Your driver profile has been saved. You can refine the rest as you use
          the app.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button type="button" onClick={onContinue}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}

function OnboardingFlowInner({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel?: () => void;
}) {
  const { state, next, previous, skip } = useOnboarding();
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submitted) {
    return <DoneCard onContinue={onComplete} />;
  }

  if (!state || !state.currentStep) {
    return null;
  }

  const stepId = String(state.currentStep.id);
  const stepMeta = STEPS.find((s) => s.id === stepId);
  const valid = isStepValid(stepId, answers);
  const isSummary = stepId === "summary";

  async function handlePrimaryAction() {
    if (isSummary) {
      setSubmitting(true);
      setError(null);
      try {
        await submitProfile(answers);
        setSubmitted(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    await next(answers);
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <Progress value={state.progressPercentage} />
        <CardTitle>{stepMeta?.title}</CardTitle>
        {stepMeta?.description && (
          <CardDescription>{stepMeta.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {renderField(stepId, answers, setAnswers)}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => (state.isFirstStep ? onCancel?.() : previous())}
          disabled={state.isFirstStep ? !onCancel : false}
        >
          Back
        </Button>
        <div className="flex gap-2">
          {state.isSkippable && (
            <Button type="button" variant="ghost" onClick={() => skip()}>
              Skip for now
            </Button>
          )}
          <Button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!valid || submitting}
          >
            {isSummary ? (submitting ? "Saving…" : "Finish") : "Next"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export function OnboardingFlow({
  onComplete,
  onCancel,
}: {
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  return (
    <OnboardingProvider steps={ENGINE_STEPS}>
      <OnboardingFlowInner
        onComplete={onComplete ?? (() => {})}
        onCancel={onCancel}
      />
    </OnboardingProvider>
  );
}
