import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/frontend/components/ui/empty";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/frontend/components/ui/table";
import {
  GUIDANCE_STYLE_OPTIONS,
  LICENSE_TYPE_OPTIONS,
  YEARS_EXPERIENCE_OPTIONS,
} from "@/frontend/onboarding/types";
import type { DriverProfile } from "@/frontend/components/profiles/types";
import { AddDriverSheet } from "./AddDriverSheet";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profiles: DriverProfile[] };

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function DriversPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load driver profiles");
        return res.json() as Promise<DriverProfile[]>;
      })
      .then((profiles) => {
        if (!cancelled) setState({ status: "ready", profiles });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Something went wrong",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-destructive">{state.message}</p>;
  }

  function handleCreated(profile: DriverProfile) {
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, profiles: [...prev.profiles, profile] }
        : prev,
    );
  }

  if (state.profiles.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No driver profiles yet</EmptyTitle>
            <EmptyDescription>
              Profiles show up here once a driver completes onboarding.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div className="flex justify-center">
          <AddDriverSheet onCreated={handleCreated} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>License</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead>Proficiency</TableHead>
            <TableHead>Guidance style</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.profiles.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell className="font-medium">#{profile.id}</TableCell>
              <TableCell>{profile.name}</TableCell>
              <TableCell>{profile.age}</TableCell>
              <TableCell>
                {labelFor(LICENSE_TYPE_OPTIONS, profile.licenseType)}
              </TableCell>
              <TableCell>
                {labelFor(YEARS_EXPERIENCE_OPTIONS, profile.yearsExperience)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {profile.selfRatedProficiency}
                </Badge>
              </TableCell>
              <TableCell>
                {labelFor(
                  GUIDANCE_STYLE_OPTIONS,
                  profile.preferredGuidanceStyle,
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <AddDriverSheet onCreated={handleCreated} />
      </div>
    </div>
  );
}
