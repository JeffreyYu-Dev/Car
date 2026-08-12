export interface LogEntry {
  id: number;
  receivedAt: string;
  payload: unknown;
}

const MAX_LOGS = 200;

export class LogStore {
  private logs: LogEntry[] = [];
  private nextId = 1;

  constructor(private readonly maxLogs = MAX_LOGS) {}

  add(payload: unknown): LogEntry {
    const entry: LogEntry = {
      id: this.nextId++,
      receivedAt: new Date().toISOString(),
      payload,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    return entry;
  }

  getAll(): LogEntry[] {
    return this.logs;
  }
}
