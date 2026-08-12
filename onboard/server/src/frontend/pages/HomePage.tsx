import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, BellRing, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { OnboardingFlow } from "@/frontend/components/onboarding/OnboardingFlow";
import { DiagnosisPanel } from "@/frontend/components/diagnostics/DiagnosisPanel";
import { ProfileDetail } from "@/frontend/components/profiles/ProfileDetail";
import { ProfileList } from "@/frontend/components/profiles/ProfileList";
import type { DriverProfile } from "@/frontend/components/profiles/types";
import {
  latestEntryForDriver,
  useDriverDiagnostics,
} from "@/frontend/diagnostics/useDriverDiagnostics";
import {
  parseBackendResponse,
  type DiagnosisAction,
  type DiagnosticEntry,
} from "@/frontend/diagnostics/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profiles: DriverProfile[] };

// Best-effort "audio alarm" for critical warnings (paper's action module:
// critical severity gets "an urgent alert along with an audio alarm").
// Silently no-ops if the browser blocks audio without a prior user gesture —
// the toast notification below still gets through either way.
function playAlarmBeep() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
    oscillator.onended = () => void ctx.close();
  } catch {
    // best-effort only
  }
}

// Surfaces the action module's delivery decision as an actual driver
// notification — paper's three delivery methods: critical faults get an
// urgent, persistent alert (+ audio alarm); reminders get a normal toast;
// advisories get a quiet, non-intrusive one.
function notifyDriver(action: DiagnosisAction) {
  switch (action.severity) {
    case "critical":
      toast.error("Urgent — vehicle needs attention", {
        description: action.message,
        icon: <AlertTriangle className="size-4" />,
        duration: 30000,
      });
      playAlarmBeep();
      break;
    case "reminder":
      toast.warning("Vehicle reminder", {
        description: action.message,
        icon: <BellRing className="size-4" />,
        duration: 8000,
      });
      break;
    case "advisory":
      toast.message("Vehicle advisory", {
        description: action.message,
        icon: <StickyNote className="size-4" />,
        duration: 6000,
      });
      break;
  }
}

export function HomePage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addingDriver, setAddingDriver] = useState(false);
  const [activeDriverId, setActiveDriverId] = useState<number | null>(null);

  const { entries: diagnostics, loading: diagnosticsLoading } = useDriverDiagnostics();

  // Last status seen per entry id — used below to notify only on a genuine
  // transition *into* "completed", never on a re-broadcast of an
  // already-completed entry (a follow-up chat message or feedback click
  // re-sends the same entry over the websocket without changing its
  // status). `seeded` guards the very first pass after load, so diagnoses
  // that were already completed before this page opened (e.g. a refresh)
  // don't fire a notification either.
  const lastStatusRef = useRef<Map<number, DiagnosticEntry["status"]>>(new Map());
  const seededRef = useRef(false);

  useEffect(() => {
    if (diagnosticsLoading) return;

    if (!seededRef.current) {
      for (const entry of diagnostics) {
        lastStatusRef.current.set(entry.id, entry.status);
      }
      seededRef.current = true;
      return;
    }

    if (activeDriverId === null) return;
    const entry = latestEntryForDriver(diagnostics, activeDriverId);
    if (!entry) return;

    const previousStatus = lastStatusRef.current.get(entry.id);
    lastStatusRef.current.set(entry.id, entry.status);

    if (entry.status === "completed" && previousStatus !== "completed") {
      const action = parseBackendResponse(entry)?.action;
      if (action) notifyDriver(action);
    }
  }, [diagnostics, diagnosticsLoading, activeDriverId]);

  const loadProfiles = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        throw new Error("Failed to load driver profiles");
      }
      const profiles = (await res.json()) as DriverProfile[];
      setState({ status: "ready", profiles });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/active-driver")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { driverId: number | null } | null) => {
        if (!cancelled && data) {
          setActiveDriverId(data.driverId);
        }
      })
      .catch(() => {
        // active driver is best-effort; the selector still works without it
      });
    return () => {
      cancelled = true;
    };
  }, []);

  let content: React.ReactNode = null;

  if (state.status === "loading") {
    content = <p className="text-sm text-muted-foreground">Loading…</p>;
  } else if (state.status === "error") {
    content = <p className="text-sm text-destructive">{state.message}</p>;
  } else if (state.profiles.length === 0 || addingDriver) {
    content = (
      <OnboardingFlow
        onComplete={() => {
          setAddingDriver(false);
          loadProfiles();
        }}
        onCancel={
          state.profiles.length > 0 ? () => setAddingDriver(false) : undefined
        }
      />
    );
  } else {
    const selected = state.profiles.find((p) => p.id === selectedId) ?? null;
    const latestDiagnostic = selected
      ? latestEntryForDriver(diagnostics, selected.id)
      : null;

    content = selected ? (
      <div className="flex w-full max-w-lg flex-col gap-6">
        <ProfileDetail
          profile={selected}
          isActive={selected.id === activeDriverId}
          onBack={() => setSelectedId(null)}
          onActiveDriverChange={setActiveDriverId}
        />
        {latestDiagnostic && <DiagnosisPanel entry={latestDiagnostic} />}
      </div>
    ) : (
      <ProfileList
        profiles={state.profiles}
        activeDriverId={activeDriverId}
        onSelect={(profile) => setSelectedId(profile.id)}
        onAddDriver={() => setAddingDriver(true)}
      />
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      {content}
    </div>
  );
}
