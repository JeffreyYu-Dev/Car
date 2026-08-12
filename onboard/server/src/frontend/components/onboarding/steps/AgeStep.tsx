import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";

interface AgeStepProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export function AgeStep({ value, onChange }: AgeStepProps) {
  return (
    <Field>
      <FieldLabel htmlFor="age">Age</FieldLabel>
      <Input
        id="age"
        type="number"
        inputMode="numeric"
        min={16}
        max={110}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? undefined : Number(raw));
        }}
        placeholder="e.g. 32"
      />
      <FieldDescription>
        We use this to tailor guidance to your experience level.
      </FieldDescription>
    </Field>
  );
}
