export interface EngineReading {
  Fault: number;
  MAP: number;
  TPS: number;
  Force: number;
  Power: number;
  RPM: number;
  ConsumptionLH: number;
  ConsumptionL100KM: number;
  Speed: number;
  CO: number;
  HC: number;
  CO2: number;
  O2: number;
  Lambda: number;
  AFR: number;
}

export interface LogEntry {
  id: number;
  receivedAt: string;
  payload: { ecu?: EngineReading } & Record<string, unknown>;
}
