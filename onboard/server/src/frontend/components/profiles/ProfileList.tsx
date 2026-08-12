import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  LICENSE_TYPE_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
} from "@/frontend/onboarding/types";
import type { DriverProfile } from "./types";

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function ProfileList({
  profiles,
  activeDriverId,
  onSelect,
  onAddDriver,
}: {
  profiles: DriverProfile[];
  activeDriverId: number | null;
  onSelect: (profile: DriverProfile) => void;
  onAddDriver: () => void;
}) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {activeDriverId === null
          ? "No driver selected. Choose who's driving to enable personalized fault guidance."
          : "Select a driver to view their profile or hand the vehicle to someone else."}
      </p>
      {profiles.map((profile) => (
        <Card
          key={profile.id}
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => onSelect(profile)}
        >
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>{profile.name}</CardTitle>
              <CardDescription>
                {profile.age} years old &middot;{" "}
                {labelFor(LICENSE_TYPE_OPTIONS, profile.licenseType)} license
                &middot;{" "}
                {labelFor(YEARS_EXPERIENCE_OPTIONS, profile.yearsExperience)}{" "}
                driving
              </CardDescription>
            </div>
            {profile.id === activeDriverId && <Badge>Active</Badge>}
          </CardHeader>
        </Card>
      ))}
      <Button onClick={onAddDriver}>Add driver</Button>
    </div>
  );
}
