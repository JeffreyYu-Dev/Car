import { Field, FieldLabel } from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";

interface NameStepProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function NameStep({ value, onChange }: NameStepProps) {
  return (
    <Field>
      <FieldLabel htmlFor="name">Name</FieldLabel>
      <Input
        id="name"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Jamie Rivera"
        autoFocus
      />
    </Field>
  );
}
