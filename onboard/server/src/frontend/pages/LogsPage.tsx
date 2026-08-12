import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ScrollText } from "lucide-react";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";
import type { LogEntry } from "@/frontend/logs/types";

const MAX_ROWS = 200;

type LoadState = "loading" | "error" | "ready";

function hasFault(entry: LogEntry): boolean {
  return !!entry.payload?.ecu && entry.payload.ecu.Fault !== 0;
}

function LogsTable({
  logs,
  emptyTitle,
  emptyDescription,
  onSelect,
}: {
  logs: LogEntry[];
  emptyTitle: string;
  emptyDescription: string;
  onSelect: (entry: LogEntry) => void;
}) {
  if (logs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScrollText />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>RPM</TableHead>
          <TableHead>Speed</TableHead>
          <TableHead>Power</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((entry) => {
          const ecu = entry.payload?.ecu;
          const fault = hasFault(entry);
          return (
            <TableRow
              key={entry.id}
              className="cursor-pointer"
              onClick={() => onSelect(entry)}
            >
              <TableCell className="text-muted-foreground">
                {new Date(entry.receivedAt).toLocaleTimeString()}
              </TableCell>
              <TableCell>
                <Badge variant={fault ? "destructive" : "secondary"}>
                  {fault ? `Fault ${ecu?.Fault}` : "OK"}
                </Badge>
              </TableCell>
              <TableCell>{ecu?.RPM ?? "—"}</TableCell>
              <TableCell>{ecu?.Speed ?? "—"}</TableCell>
              <TableCell>{ecu?.Power ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function LogDetailDialog({
  entry,
  onOpenChange,
}: {
  entry: LogEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const ecu = entry?.payload?.ecu;

  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log #{entry?.id}</DialogTitle>
          <DialogDescription>
            {entry && new Date(entry.receivedAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        {ecu ? (
          <Table>
            <TableBody>
              {Object.entries(ecu).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{key}</TableCell>
                  <TableCell>{String(value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(entry?.payload, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LogsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/logs")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load logs");
        return res.json() as Promise<LogEntry[]>;
      })
      .then((initial) => {
        if (cancelled) return;
        setLogs(initial.slice(-MAX_ROWS).reverse());
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/`);
    socketRef.current = socket;

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data) as {
          kind?: string;
          data?: LogEntry;
        };
        if (message.kind !== "log" || !message.data) {
          return;
        }
        setLogs((prev) => [message.data as LogEntry, ...prev].slice(0, MAX_ROWS));
      } catch {
        // ignore malformed messages
      }
    });

    return () => {
      cancelled = true;
      socket.close();
    };
  }, []);

  const faults = useMemo(() => logs.filter(hasFault), [logs]);

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (state === "error") {
    return <p className="text-sm text-destructive">Failed to load logs.</p>;
  }

  return (
    <>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="faults">
            <AlertTriangle />
            Faults
            {faults.length > 0 && (
              <Badge variant="destructive">{faults.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <LogsTable
            logs={logs}
            emptyTitle="No logs yet"
            emptyDescription="Incoming ECU readings will appear here in real time."
            onSelect={setSelectedEntry}
          />
        </TabsContent>
        <TabsContent value="faults">
          <LogsTable
            logs={faults}
            emptyTitle="No faults"
            emptyDescription="Faulty ECU readings will show up here as they come in."
            onSelect={setSelectedEntry}
          />
        </TabsContent>
      </Tabs>
      <LogDetailDialog
        entry={selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      />
    </>
  );
}
