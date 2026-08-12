import { AsyncLocalStorage } from "node:async_hooks";

export interface TraceStage {
  name: string;
  startedAt: string;
  durationMs: number;
  data?: unknown;
  error?: string;
}

export interface Trace {
  id: number;
  method: string;
  path: string;
  timestamp: string;
  request: {
    query: Record<string, string>;
    body: unknown;
  };
  stages: TraceStage[];
  // Set once the request has finished — while false, the trace is still
  // moving through the pipeline and the dashboard shows it live.
  finished: boolean;
  status?: number;
  durationMs?: number;
  response?: unknown;
  error?: string;
}

interface TraceContext {
  stages: TraceStage[];
  onStage?: (stage: TraceStage) => void;
}

const als = new AsyncLocalStorage<TraceContext>();

// Opens a trace context for the lifetime of `fn`. Any traceStage/
// recordTraceStage call made anywhere in the async call graph underneath
// (across files/modules) attaches to this same context. The accumulated
// stages are returned via `getStages()` even if `fn` throws, so callers can
// still record a full trace for failed requests. `onStage` fires as each
// stage completes, so callers can broadcast live progress.
export function runWithTrace<T>(
  fn: () => Promise<T>,
  onStage?: (stage: TraceStage) => void,
): { promise: Promise<T>; getStages: () => TraceStage[] } {
  const ctx: TraceContext = { stages: [], onStage };
  const promise = als.run(ctx, fn);
  return { promise, getStages: () => ctx.stages };
}

// Wraps an async unit of work (an embedding call, a DB query, ...) as a
// named pipeline stage, recording its duration and a description of its
// result (or error) into the enclosing trace, if one is open.
export async function traceStage<T>(
  name: string,
  fn: () => Promise<T>,
  describe?: (result: T) => unknown,
): Promise<T> {
  const start = performance.now();
  const startedAt = new Date().toISOString();
  const ctx = als.getStore();
  try {
    const result = await fn();
    const stage: TraceStage = {
      name,
      startedAt,
      durationMs: Math.round(performance.now() - start),
      data: describe ? describe(result) : result,
    };
    ctx?.stages.push(stage);
    ctx?.onStage?.(stage);
    return result;
  } catch (err) {
    const stage: TraceStage = {
      name,
      startedAt,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
    ctx?.stages.push(stage);
    ctx?.onStage?.(stage);
    throw err;
  }
}

// Records a synchronous, already-computed stage (e.g. a pure in-memory
// computation) into the enclosing trace.
export function recordTraceStage(name: string, data: unknown): void {
  const ctx = als.getStore();
  const stage: TraceStage = {
    name,
    startedAt: new Date().toISOString(),
    durationMs: 0,
    data,
  };
  ctx?.stages.push(stage);
  ctx?.onStage?.(stage);
}

// Truncates an embedding vector for transport/display: full vectors are
// large and not meaningfully readable, so traces only carry a preview plus
// the dimensionality.
export function previewVector(vector: number[], take = 8) {
  return {
    dims: vector.length,
    preview: vector.slice(0, take).map((v) => Math.round(v * 10000) / 10000),
  };
}

const MAX_TRACES = 200;

type TraceListener = (trace: Trace) => void;

// Tracks the lifecycle of a request as it moves through the pipeline —
// created "in progress" when the request starts, updated as each stage
// completes, and finalized once the response is ready — so the dashboard
// can show live progress the same way onboard's DiagnosticStore does.
export class TraceStore {
  private traces: Trace[] = [];
  private nextId = 1;
  private listeners = new Set<TraceListener>();

  constructor(private readonly maxTraces = MAX_TRACES) {}

  start(entry: Pick<Trace, "method" | "path" | "timestamp" | "request">): Trace {
    const trace: Trace = { id: this.nextId++, stages: [], finished: false, ...entry };
    this.traces.push(trace);
    if (this.traces.length > this.maxTraces) {
      this.traces.shift();
    }
    this.notify(trace);
    return trace;
  }

  appendStage(id: number, stage: TraceStage): void {
    const trace = this.getById(id);
    if (!trace) return;
    trace.stages.push(stage);
    this.notify(trace);
  }

  finish(
    id: number,
    patch: Pick<Trace, "status" | "durationMs"> & Partial<Pick<Trace, "response" | "error">>,
  ): void {
    const trace = this.getById(id);
    if (!trace) return;
    Object.assign(trace, patch, { finished: true });
    this.notify(trace);
  }

  getAll(): Trace[] {
    return this.traces;
  }

  getById(id: number): Trace | undefined {
    return this.traces.find((t) => t.id === id);
  }

  subscribe(listener: TraceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(trace: Trace): void {
    for (const listener of this.listeners) listener(trace);
  }
}
