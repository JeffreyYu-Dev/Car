import { buildDriverProfile, type DriverProfile } from "@/llama-cpp";

// Which driver is currently sitting in the vehicle. Selected on the home
// screen; used to personalize the fault diagnostic prompt. There's no
// concept of multiple vehicles/sessions yet, so this is a single in-memory
// value for the whole server, same as LogStore/DiagnosticStore.
let activeDriverId: number | null = null;

export function getActiveDriverId(): number | null {
  return activeDriverId;
}

export function setActiveDriverId(id: number | null): void {
  activeDriverId = id;
}

export async function getActiveDriverProfile(): Promise<DriverProfile | null> {
  if (activeDriverId === null) {
    return null;
  }
  return buildDriverProfile(activeDriverId);
}
