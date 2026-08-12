import { MultiChoiceField } from "../fields/MultiChoiceField";
import { MECHANICAL_ACTION_OPTIONS } from "@/frontend/onboarding/types";

interface MechanicalProficiencyStepProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function MechanicalProficiencyStep({
  value,
  onChange,
}: MechanicalProficiencyStepProps) {
  return (
    <MultiChoiceField
      name="mechanical-actions"
      options={MECHANICAL_ACTION_OPTIONS}
      value={value}
      onChange={onChange}
      exclusiveValue="none"
    />
  );
}
