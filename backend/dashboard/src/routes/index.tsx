import { createFileRoute, Link } from '@tanstack/react-router'
import { Bot, Loader2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'
import { useTraces } from '#/hooks/use-traces'
import type { Trace } from '#/lib/api'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/')({ component: Home })

function statusVariant(status: number): 'default' | 'secondary' | 'destructive' {
  if (status >= 500) return 'destructive'
  if (status >= 200 && status < 300) return 'secondary'
  return 'default'
}

function StatusCell({ trace }: { trace: Trace }) {
  if (!trace.finished) {
    return (
      <Badge variant="secondary">
        <Loader2 className="animate-spin" />
        Running
      </Badge>
    )
  }
  return <Badge variant={statusVariant(trace.status!)}>{trace.status}</Badge>
}

function queryPreview(body: unknown): string {
  if (body && typeof body === 'object' && 'query' in body) {
    const query = (body as { query?: unknown }).query
    if (typeof query === 'string') return query
  }
  return '—'
}

function Home() {
  const { traces, loading, error, connected } = useTraces()

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Every on-board LLM query into the backend, and every stage it passed
          through — query augmentation, historical-query matching, knowledge
          retrieval.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'size-2 rounded-full',
              connected ? 'bg-emerald-500' : 'bg-muted-foreground',
            )}
          />
          {connected ? 'Live' : 'Disconnected'}
        </div>
      </div>

      {error && <p className="text-destructive text-sm">Failed to load traces: {error}</p>}

      {loading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!loading && traces.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bot />
            </EmptyMedia>
            <EmptyTitle>No queries yet</EmptyTitle>
            <EmptyDescription>
              Incoming on-board LLM queries will appear here in real time.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!loading && traces.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Query</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-24">Duration</TableHead>
              <TableHead className="w-24">Stages</TableHead>
              <TableHead className="w-44">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {traces.map((trace) => (
              <TableRow key={trace.id} className="hover:bg-muted/50">
                <TableCell className="text-muted-foreground">
                  <Link to="/traces/$traceId" params={{ traceId: String(trace.id) }}>
                    #{trace.id}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    to="/traces/$traceId"
                    params={{ traceId: String(trace.id) }}
                    className="block max-w-xl truncate"
                  >
                    {queryPreview(trace.request.body)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link to="/traces/$traceId" params={{ traceId: String(trace.id) }}>
                    <StatusCell trace={trace} />
                  </Link>
                </TableCell>
                <TableCell>
                  <Link to="/traces/$traceId" params={{ traceId: String(trace.id) }}>
                    {trace.finished ? `${trace.durationMs}ms` : '—'}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link to="/traces/$traceId" params={{ traceId: String(trace.id) }}>
                    {trace.stages.length}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    to="/traces/$traceId"
                    params={{ traceId: String(trace.id) }}
                    className="text-muted-foreground block text-xs"
                  >
                    {new Date(trace.timestamp).toLocaleString()}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
