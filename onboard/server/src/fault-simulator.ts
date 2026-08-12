import { join } from "node:path";
import type { EngineReading } from "@/frontend/logs/types";
import { Engine } from "@/monitoring/mock-engine";

type FaultType = 1 | 2 | 3;

const DATA_PATH = join(
  import.meta.dir,
  "monitoring",
  "mock-engine",
  "data.csv",
);

const engine = new Engine();
let loaded: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!loaded) {
    loaded = engine.loadData(DATA_PATH);
  }
  return loaded;
}

// Picks one of the three fault scenarios from the paper (lean mixture, rich
// mixture, sensor fault) and returns a real recorded ECU reading for it from
// the EngineFaultDB sample data, instead of a synthetic jittered guess.
export async function generateRandomFault(): Promise<EngineReading> {
  await ensureLoaded();

  const faultType = (Math.floor(Math.random() * 3) + 1) as FaultType;
  const reading = engine.induceFault(faultType);

  if (!reading) {
    throw new Error(`No recorded readings for fault type ${faultType}`);
  }

  return reading;
}
