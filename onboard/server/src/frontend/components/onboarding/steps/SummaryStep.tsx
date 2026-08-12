import { deriveSelfRatedProficiency } from "@/frontend/onboarding/derive";
import {
  GUIDANCE_STYLE_OPTIONS,
  LICENSE_TYPE_OPTIONS,
  MAINTENANCE_RELATIONSHIP_OPTIONS,
  MECHANICAL_ACTION_OPTIONS,
  PHYSICAL_LIMITATION_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
  type DriverProfileData,
} from "@/frontend/onboarding/types";

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | undefined,
) {
  return options.find((o) => o.value === value)?.label ?? "—";
}

interface SummaryStepProps {
  answers: Partial<DriverProfileData>;
}

export function SummaryStep({ answers }: SummaryStepProps) {
  const proficiency = deriveSelfRatedProficiency(
    answers.mechanical_actions ?? [],
  );

  const physicalNotes = [
    ...(answers.physical_limitations ?? []).map((v) =>
      labelFor(PHYSICAL_LIMITATION_OPTIONS, v),
    ),
    ...(answers.physical_limitations_other
      ? [answers.physical_limitations_other]
      : []),
  ];

  const rows: Array<[string, string]> = [
    ["Name", answers.name?.trim() || "—"],
    ["Age", answers.age ? String(answers.age) : "—"],
    ["License", labelFor(LICENSE_TYPE_OPTIONS, answers.license_type)],
    [
      "Experience",
      labelFor(YEARS_EXPERIENCE_OPTIONS, answers.years_experience),
    ],
    [
      "Mechanical tasks done",
      (answers.mechanical_actions ?? [])
        .map((v) => labelFor(MECHANICAL_ACTION_OPTIONS, v))
        .join(", ") || "—",
    ],
    ["Derived proficiency", proficiency],
    [
      "Guidance style",
      labelFor(GUIDANCE_STYLE_OPTIONS, answers.preferred_guidance_style),
    ],
    ["Physical considerations", physicalNotes.join(", ") || "None noted"],
    [
      "Maintenance relationship",
      answers.maintenance_relationship
        ? labelFor(
            MAINTENANCE_RELATIONSHIP_OPTIONS,
            answers.maintenance_relationship,
          )
        : "Not set — can add later",
    ],
  ];

  return (
    <dl className="flex flex-col gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-4 border-b pb-2 last:border-0"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
