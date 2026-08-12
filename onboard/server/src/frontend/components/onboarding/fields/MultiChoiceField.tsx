import { Checkbox } from "@/frontend/components/ui/checkbox";
import { Label } from "@/frontend/components/ui/label";

interface Option {
  value: string;
  label: string;
}

interface MultiChoiceFieldProps {
  name: string;
  options: readonly Option[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Selecting this option clears all others, and vice versa (e.g. "None of these"). */
  exclusiveValue?: string;
}

export function MultiChoiceField({
  name,
  options,
  value,
  onChange,
  exclusiveValue,
}: MultiChoiceFieldProps) {
  function toggle(optionValue: string, checked: boolean) {
    if (!checked) {
      onChange(value.filter((v) => v !== optionValue));
      return;
    }
    if (exclusiveValue && optionValue === exclusiveValue) {
      onChange([exclusiveValue]);
      return;
    }
    onChange([...value.filter((v) => v !== exclusiveValue), optionValue]);
  }

  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <Label
          key={option.value}
          htmlFor={`${name}-${option.value}`}
          className="flex items-center gap-3 rounded-md border p-3 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
        >
          <Checkbox
            id={`${name}-${option.value}`}
            checked={value.includes(option.value)}
            onCheckedChange={(checked) =>
              toggle(option.value, checked === true)
            }
          />
          {option.label}
        </Label>
      ))}
    </div>
  );
}
