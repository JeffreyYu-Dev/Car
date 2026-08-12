import { Label } from "@/frontend/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/frontend/components/ui/radio-group";

interface Option {
  value: string;
  label: string;
}

interface SingleChoiceFieldProps {
  name: string;
  options: readonly Option[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function SingleChoiceField({
  name,
  options,
  value,
  onChange,
}: SingleChoiceFieldProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange}>
      {options.map((option) => (
        <Label
          key={option.value}
          htmlFor={`${name}-${option.value}`}
          className="flex items-center gap-3 rounded-md border p-3 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
        >
          <RadioGroupItem id={`${name}-${option.value}`} value={option.value} />
          {option.label}
        </Label>
      ))}
    </RadioGroup>
  );
}
