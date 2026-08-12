import csvParser from "csv-parser";
import { createReadStream } from "node:fs";
import type { EngineReading } from "@/frontend/logs/types";

function parseRow(row: Record<string, string>): EngineReading {
  return {
    Fault: Number(row.Fault),
    MAP: Number(row.MAP),
    TPS: Number(row.TPS),
    Force: Number(row.Force),
    Power: Number(row.Power),
    RPM: Number(row.RPM),
    ConsumptionLH: Number(row["Consumption L/H"]),
    ConsumptionL100KM: Number(row["Consumption L/100KM"]),
    Speed: Number(row.Speed),
    CO: Number(row.CO),
    HC: Number(row.HC),
    CO2: Number(row.CO2),
    O2: Number(row.O2),
    Lambda: Number(row.Lambda),
    AFR: Number(row.AFR),
  };
}

// Recorded ECU readings (EngineFaultDB sample data), grouped by fault class
// so a fault type maps to real sensor readings instead of a jittered guess.
export class Engine {
  private faults = new Map<number, EngineReading[]>();

  async loadData(path: string) {
    await new Promise((resolve, reject) => {
      createReadStream(path)
        .pipe(csvParser())
        .on("data", (row: Record<string, string>) => {
          const parsedRow = parseRow(row);

          if (this.faults.has(parsedRow.Fault)) {
            const faultClass = this.faults.get(parsedRow.Fault)!;
            faultClass.push(parsedRow);
          } else {
            this.faults.set(parsedRow.Fault, [parsedRow]);
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });
  }

  // Picks a random recorded reading from the given fault class.
  induceFault(fault: number): EngineReading | undefined {
    const faultClass = this.faults.get(fault);

    if (!faultClass || faultClass.length === 0) {
      return undefined;
    }

    const index = Math.floor(Math.random() * faultClass.length);
    return faultClass[index];
  }
}
