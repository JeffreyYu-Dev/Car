import { useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/frontend/components/ui/field";
import { Input } from "@/frontend/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/frontend/components/ui/sheet";
import { MultiChoiceField } from "@/frontend/components/onboarding/fields/MultiChoiceField";
import { SingleChoiceField } from "@/frontend/components/onboarding/fields/SingleChoiceField";
import { deriveSelfRatedProficiency } from "@/frontend/onboarding/derive";
import {
  GUIDANCE_STYLE_OPTIONS,
  LICENSE_TYPE_OPTIONS,
  MAINTENANCE_RELATIONSHIP_OPTIONS,
  MECHANICAL_ACTION_OPTIONS,
  PHYSICAL_LIMITATION_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
} from "@/frontend/onboarding/types";
import type { DriverProfile } from "@/frontend/components/profiles/types";

const initialState = {
  name: "",
  age: "",
  licenseType: undefined as DriverProfile["licenseType"] | undefined,
  yearsExperience: undefined as DriverProfile["yearsExperience"] | undefined,
  mechanicalActions: [] as string[],
  preferredGuidanceStyle: undefined as
    DriverProfile["preferredGuidanceStyle"] | undefined,
  physicalLimitations: [] as string[],
  maintenanceRelationship: undefined as
    DriverProfile["maintenanceRelationship"] | undefined,
};

interface AddDriverSheetProps {
  onCreated: (profile: DriverProfile) => void;
}

export function AddDriverSheet({ onCreated }: AddDriverSheetProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    form.name.trim() !== "" &&
    form.age.trim() !== "" &&
    Number(form.age) > 0 &&
    form.licenseType !== undefined &&
    form.yearsExperience !== undefined &&
    form.preferredGuidanceStyle !== undefined;

  function reset() {
    setForm(initialState);
    setError(null);
  }

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          age: Number(form.age),
          licenseType: form.licenseType,
          yearsExperience: form.yearsExperience,
          mechanicalActions: form.mechanicalActions,
          selfRatedProficiency: deriveSelfRatedProficiency(
            form.mechanicalActions,
          ),
          preferredGuidanceStyle: form.preferredGuidanceStyle,
          physicalLimitations: form.physicalLimitations,
          maintenanceRelationship: form.maintenanceRelationship ?? null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create driver profile");
      }
      const profile = (await res.json()) as DriverProfile;
      onCreated(profile);
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger asChild>
        <Button>Add driver</Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add driver</SheetTitle>
          <SheetDescription>
            Create a new driver profile manually.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Jamie Rivera"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="age">Age</FieldLabel>
              <Input
                id="age"
                type="number"
                min={1}
                value={form.age}
                onChange={(e) =>
                  setForm((f) => ({ ...f, age: e.target.value }))
                }
              />
            </Field>

            <FieldSet>
              <FieldLabel>License type</FieldLabel>
              <SingleChoiceField
                name="licenseType"
                options={LICENSE_TYPE_OPTIONS}
                value={form.licenseType}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    licenseType: v as DriverProfile["licenseType"],
                  }))
                }
              />
            </FieldSet>

            <FieldSet>
              <FieldLabel>Years of experience</FieldLabel>
              <SingleChoiceField
                name="yearsExperience"
                options={YEARS_EXPERIENCE_OPTIONS}
                value={form.yearsExperience}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    yearsExperience: v as DriverProfile["yearsExperience"],
                  }))
                }
              />
            </FieldSet>

            <FieldSet>
              <FieldLabel>Mechanical experience</FieldLabel>
              <MultiChoiceField
                name="mechanicalActions"
                options={MECHANICAL_ACTION_OPTIONS}
                value={form.mechanicalActions}
                exclusiveValue="none"
                onChange={(v) =>
                  setForm((f) => ({ ...f, mechanicalActions: v }))
                }
              />
            </FieldSet>

            <FieldSet>
              <FieldLabel>Preferred guidance style</FieldLabel>
              <SingleChoiceField
                name="preferredGuidanceStyle"
                options={GUIDANCE_STYLE_OPTIONS}
                value={form.preferredGuidanceStyle}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    preferredGuidanceStyle:
                      v as DriverProfile["preferredGuidanceStyle"],
                  }))
                }
              />
            </FieldSet>

            <FieldSet>
              <FieldLabel>Physical limitations</FieldLabel>
              <MultiChoiceField
                name="physicalLimitations"
                options={PHYSICAL_LIMITATION_OPTIONS}
                value={form.physicalLimitations}
                onChange={(v) =>
                  setForm((f) => ({ ...f, physicalLimitations: v }))
                }
              />
            </FieldSet>

            <FieldSet>
              <FieldLabel>Maintenance relationship</FieldLabel>
              <SingleChoiceField
                name="maintenanceRelationship"
                options={MAINTENANCE_RELATIONSHIP_OPTIONS}
                value={form.maintenanceRelationship ?? undefined}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    maintenanceRelationship:
                      v as DriverProfile["maintenanceRelationship"],
                  }))
                }
              />
            </FieldSet>
          </FieldGroup>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? "Saving…" : "Save driver"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
