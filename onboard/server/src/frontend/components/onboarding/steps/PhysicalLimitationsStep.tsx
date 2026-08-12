import { Field, FieldLabel } from "@/frontend/components/ui/field";
import { Textarea } from "@/frontend/components/ui/textarea";
import { MultiChoiceField } from "../fields/MultiChoiceField";
import { PHYSICAL_LIMITATION_OPTIONS } from "@/frontend/onboarding/types";

interface PhysicalLimitationsStepProps {
  value: string[];
  other: string;
  onChange: (value: string[]) => void;
  onOtherChange: (other: string) => void;
}

export function PhysicalLimitationsStep({
  value,
  other,
  onChange,
  onOtherChange,
}: PhysicalLimitationsStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <MultiChoiceField
        name="physical-limitations"
        options={PHYSICAL_LIMITATION_OPTIONS}
        value={value}
        onChange={onChange}
      />
      <Field>
        <FieldLabel htmlFor="physical-limitations-other">
          Other (optional)
        </FieldLabel>
        <Textarea
          id="physical-limitations-other"
          value={other}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Anything else worth knowing?"
        />
      </Field>
    </div>
  );
}
