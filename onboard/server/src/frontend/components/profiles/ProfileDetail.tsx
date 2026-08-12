import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  GUIDANCE_STYLE_OPTIONS,
  LICENSE_TYPE_OPTIONS,
  MAINTENANCE_RELATIONSHIP_OPTIONS,
  PHYSICAL_LIMITATION_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
} from "@/frontend/onboarding/types";
import type { DriverProfile } from "./types";

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function ProfileDetail({
  profile,
  isActive,
  onBack,
  onActiveDriverChange,
}: {
  profile: DriverProfile;
  isActive: boolean;
  onBack: () => void;
  onActiveDriverChange: (driverId: number | null) => void;
}) {
  const [pending, setPending] = useState(false);

  async function setActiveDriver(driverId: number | null) {
    setPending(true);
    try {
      const res = await fetch("/api/active-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) {
        throw new Error("Failed to update the active driver");
      }
      onActiveDriverChange(driverId);
      toast.success(
        driverId === null
          ? "Driver deselected"
          : `${profile.name} is now driving`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{profile.name}</CardTitle>
          <CardDescription>
            {profile.age} years old &middot;{" "}
            {labelFor(LICENSE_TYPE_OPTIONS, profile.licenseType)} license
          </CardDescription>
        </div>
        {isActive && <Badge>Currently driving</Badge>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-muted-foreground">Experience</p>
            <p>{labelFor(YEARS_EXPERIENCE_OPTIONS, profile.yearsExperience)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Mechanical proficiency</p>
            <p className="capitalize">{profile.selfRatedProficiency}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Guidance style</p>
            <p>
              {labelFor(GUIDANCE_STYLE_OPTIONS, profile.preferredGuidanceStyle)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Maintenance relationship</p>
            <p>
              {profile.maintenanceRelationship
                ? labelFor(
                    MAINTENANCE_RELATIONSHIP_OPTIONS,
                    profile.maintenanceRelationship,
                  )
                : "Not set"}
            </p>
          </div>
        </div>
        {profile.physicalLimitations.length > 0 && (
          <div className="text-sm">
            <p className="text-muted-foreground">Physical limitations</p>
            <p>
              {profile.physicalLimitations
                .map((v) => labelFor(PHYSICAL_LIMITATION_OPTIONS, v))
                .join(", ")}
              {profile.physicalLimitationsOther
                ? ` — ${profile.physicalLimitationsOther}`
                : ""}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back to drivers
          </Button>
          {isActive ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setActiveDriver(null)}
            >
              {pending && <Loader2 className="animate-spin" />}
              Deselect driver
            </Button>
          ) : (
            <Button
              type="button"
              disabled={pending}
              onClick={() => setActiveDriver(profile.id)}
            >
              {pending && <Loader2 className="animate-spin" />}
              Set as active driver
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
