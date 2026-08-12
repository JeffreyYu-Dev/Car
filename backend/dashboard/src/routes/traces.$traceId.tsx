import type { ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertCircle,
  BookOpen,
  Bot,
  CheckCircle2,
  Circle,
  GitMerge,
  History,
  Loader2,
  MessageSquareText,
  Sparkles,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { useTrace } from '#/hooks/use-trace'
import { fetchTrace, type Trace, type TraceStage } from '#/lib/api'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/traces/$traceId')({
  component: TraceDetail,
  loader: ({ params }) => fetchTrace(params.traceId),
})

function JsonView({ value }: { value: unknown }) {
  if (value === undefined) {
    return <span className="text-muted-foreground text-sm italic">none</span>
  }
  return (
    <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 font-mono text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function statusClass(status?: number) {
  if (status === undefined) return 'text-muted-foreground'
  if (status >= 500) return 'text-destructive'
  if (status >= 400) return 'text-amber-600 dark:text-amber-500'
  if (status >= 200) return 'text-emerald-600 dark:text-emerald-500'
  return 'text-muted-foreground'
}

type StageStatus = 'done' | 'loading' | 'pending' | 'error' | 'skipped'

interface StageRow {
  title: string
  description: string
  status: StageStatus
  icon: LucideIcon
  content?: ReactNode
}

function StageStatusBadge({ status }: { status: StageStatus }) {
  switch (status) {
    case 'done':
      return (
        <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 />
          Done
        </Badge>
      )
    case 'loading':
      return (
        <Badge variant="secondary">
          <Loader2 className="animate-spin" />
          In progress
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="destructive">
          <XCircle />
          Failed
        </Badge>
      )
    case 'skipped':
      return (
        <Badge variant="outline">
          <AlertCircle />
          Skipped
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Circle />
          Pending
        </Badge>
      )
  }
}

function StageRowCard({ stage, index }: { stage: StageRow; index: number }) {
  const Icon = stage.icon
  return (
    <Card
      className={cn(
        stage.status === 'pending' && 'opacity-60',
        stage.status === 'error' && 'border-destructive',
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="text-muted-foreground size-4" />
          {index + 1}. {stage.title}
        </CardTitle>
        <StageStatusBadge status={stage.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs">{stage.description}</p>
        {stage.content}
      </CardContent>
    </Card>
  )
}

// A single ratio against a limit (similarity / weight / relevance / rank, all
// 0-1) reads better as a meter than as a bare decimal — same-hue fill/track
// so the bar's fullness carries the magnitude at a glance.
function Meter({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="h-1.5 min-w-0 flex-1 rounded-full bg-primary/15">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
        {pct}%
      </span>
    </div>
  )
}

function ScoreRow({ label, value, meta }: { label: string; value: number; meta?: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="line-clamp-2 text-xs">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Meter value={value} />
        {meta && <span className="text-muted-foreground shrink-0 text-[11px]">{meta}</span>}
      </div>
    </div>
  )
}

// Canonical definitions of the LLM query pipeline, in the order they run —
// see backend/server/src/index.tsx (augmentQuery -> searchKnowledgeBase) and
// the traceStage() calls inside each. A stage's live status is derived from
// its position in trace.stages relative to trace.finished, mirroring
// onboard's DiagnosticStore lifecycle (summarizing -> sent -> completed).
const STAGE_DEFINITIONS: {
  name: string
  title: string
  description: string
  icon: LucideIcon
  render: (data: any) => ReactNode
}[] = [
  {
    name: 'embedding.generate',
    title: 'Embed Query',
    description:
      "Turns the on-board LLM's condensed query text into a vector embedding using the local embedding model.",
    icon: Sparkles,
    render: (data) => (
      <div className="flex flex-col gap-2 text-xs">
        <p className="text-muted-foreground">
          Encoded into a{' '}
          <span className="text-foreground font-medium">{data.dims}-dimension</span>{' '}
          vector.
        </p>
        <p className="rounded-md bg-muted p-3">{data.text}</p>
      </div>
    ),
  },
  {
    name: 'qdrant.historical_search',
    title: 'Historical Query Search',
    description:
      'Searches Qdrant for past queries sharing the same prefix, to find semantically similar cases from other vehicles.',
    icon: History,
    render: (data) => (
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="max-w-full truncate">
            {data.prefix}
          </Badge>
          <span className="text-muted-foreground">
            {data.matchCount} of top {data.topK} matched
          </span>
        </div>
        {data.matches.length > 0 ? (
          <div className="flex flex-col gap-1">
            {data.matches.map((m: any, i: number) => (
              <ScoreRow key={i} label={m.queryText} value={m.similarity} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No past queries with this prefix were similar enough to use.
          </p>
        )}
      </div>
    ),
  },
  {
    name: 'augmentation.aggregate',
    title: 'Query Augmentation',
    description:
      'Blends the query embedding with similar historical queries, weighted by similarity, into a richer embedding for retrieval.',
    icon: GitMerge,
    render: (data) => (
      <div className="flex flex-col gap-2 text-xs">
        <p className="text-muted-foreground">
          {data.matchCount > 0
            ? `Blended in ${data.matchCount} historical ${data.matchCount === 1 ? 'query' : 'queries'} — kept ${Math.round(data.alpha * 100)}% weight on the original query.`
            : (data.note ??
              'No historical matches were available, so the query was used unmodified.')}
        </p>
        {data.weights.length > 0 && (
          <div className="flex flex-col gap-1">
            {data.weights.map((w: any, i: number) => (
              <ScoreRow
                key={i}
                label={`Blend weight — match ${i + 1}`}
                value={w.weight}
                meta={`${Math.round(w.similarity * 100)}% similar`}
              />
            ))}
          </div>
        )}
      </div>
    ),
  },
  {
    name: 'qdrant.knowledge_search',
    title: 'Knowledge Retrieval',
    description:
      'Searches the RAG knowledge base for the top-matching manuals, bulletins, and reports for the augmented query.',
    icon: BookOpen,
    render: (data) => (
      <div className="flex flex-col gap-2 text-xs">
        <p className="text-muted-foreground">
          Found {data.resultCount} of the top {data.topM} knowledge base entries.
        </p>
        {data.items.length > 0 ? (
          <div className="flex flex-col gap-1">
            {data.items.map((item: any, i: number) => (
              <ScoreRow key={i} label={item.content} value={item.rank} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Nothing came back — the knowledge base may still be empty.
          </p>
        )}
      </div>
    ),
  },
  {
    name: 'llm.build_prompt',
    title: 'Build Cloud LLM Prompt',
    description:
      'Combines the driver profile, initial query, and retrieved knowledge into the final system/user messages the cloud LLM will receive.',
    icon: MessageSquareText,
    render: (data) => (
      <div className="flex flex-col gap-2">
        {data.messages.map((message: { role: string; content: string }, i: number) => (
          <div key={i} className="rounded-md border p-2">
            <span className="text-muted-foreground text-xs font-semibold uppercase">
              {message.role}
            </span>
            <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs">
              {message.content}
            </pre>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: 'llm.cloud_completion',
    title: 'Cloud LLM Response',
    description:
      'Sends the prompt above to the configured cloud LLM (see CLOUD_LLM_BASE_URL/MODEL) and returns the personalized warning.',
    icon: Bot,
    render: (data) => (
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{data.model}</Badge>
          <span className="text-muted-foreground">{data.baseUrl}</span>
        </div>
        <p className="rounded-md bg-muted p-3 whitespace-pre-wrap">{data.content}</p>
      </div>
    ),
  },
]

// Mirrors onboard's buildStages(): walks the canonical pipeline in order,
// matching each definition against the trace's recorded stages. Stages
// after the last one recorded are "loading" (the next one to run) or
// "pending" (not reached yet) while the trace is still in flight, and
// "skipped" once it has finished without reaching them (e.g. an earlier
// stage failed).
function buildStageRows(trace: Trace): StageRow[] {
  const byName = new Map(trace.stages.map((s) => [s.name, s] as const))
  let seenGap = false

  return STAGE_DEFINITIONS.map((def) => {
    const stage: TraceStage | undefined = byName.get(def.name)

    if (stage) {
      return {
        title: def.title,
        description: def.description,
        icon: def.icon,
        status: stage.error ? ('error' as const) : ('done' as const),
        content: stage.error ? (
          <p className="text-destructive text-xs">{stage.error}</p>
        ) : (
          def.render(stage.data)
        ),
      }
    }

    const status: StageStatus = trace.finished
      ? 'skipped'
      : seenGap
        ? 'pending'
        : 'loading'
    seenGap = true

    return {
      title: def.title,
      description: def.description,
      icon: def.icon,
      status,
      content:
        status === 'loading' ? (
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Loader2 className="size-3 animate-spin" />
            Running…
          </p>
        ) : status === 'pending' ? (
          <p className="text-muted-foreground text-xs">Not started yet.</p>
        ) : null,
    }
  })
}

function TraceDetail() {
  const initial = Route.useLoaderData()
  const trace = useTrace(initial)
  const stages = buildStageRows(trace)

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <Link to="/" className="text-muted-foreground w-fit text-sm hover:underline">
          &larr; All queries
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Query #{trace.id}</h1>
          {trace.finished ? (
            <Badge variant="outline" className={statusClass(trace.status)}>
              {trace.status}
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Loader2 className="animate-spin" />
              In progress
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {new Date(trace.timestamp).toLocaleString()}
          {trace.finished && trace.durationMs !== undefined && (
            <> · {trace.durationMs}ms total</>
          )}
          {' · '}
          {trace.stages.length} of {STAGE_DEFINITIONS.length} stages
        </p>
      </div>

      {trace.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-sm">Request failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive text-sm">{trace.error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Request</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {Object.keys(trace.request.query).length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs uppercase">Query</p>
              <JsonView value={trace.request.query} />
            </div>
          )}
          <div>
            <p className="text-muted-foreground mb-1 text-xs uppercase">Body</p>
            <JsonView value={trace.request.body} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {stages.map((stage, i) => (
          <StageRowCard key={stage.title} stage={stage} index={i} />
        ))}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Response</CardTitle>
        </CardHeader>
        <CardContent>
          {trace.finished ? (
            <JsonView value={trace.response} />
          ) : (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3 animate-spin" />
              Waiting for the pipeline to finish…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
