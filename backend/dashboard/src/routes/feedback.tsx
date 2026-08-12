import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  BellRing,
  BookmarkCheck,
  Loader2,
  MessageSquareWarning,
  Siren,
  StickyNote,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import {
  fetchHistoricalQueries,
  setExpertScore,
  type DeliveryChannel,
  type HistoricalQuery,
} from '#/lib/api'

// Paper's action module: three delivery methods selected deterministically
// from severity — critical faults get an urgent dashboard alert with an
// audio alarm, reminders show on the dashboard at an appropriate time, and
// advisories are passive memos the driver checks at their convenience.
const DELIVERY_CHANNEL_META: Record<
  DeliveryChannel,
  { label: string; icon: typeof Siren; className: string }
> = {
  dashboard_alert: {
    label: 'Dashboard alert',
    icon: Siren,
    className: 'text-destructive',
  },
  dashboard_reminder: {
    label: 'Dashboard reminder',
    icon: BellRing,
    className: 'text-amber-600 dark:text-amber-500',
  },
  memo: {
    label: 'Memo',
    icon: StickyNote,
    className: 'text-muted-foreground',
  },
}

function ActionBadge({ deliveryChannel }: { deliveryChannel: DeliveryChannel | null }) {
  if (!deliveryChannel) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  const meta = DELIVERY_CHANNEL_META[deliveryChannel]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={meta.className}>
      <Icon />
      {meta.label}
    </Badge>
  )
}

export const Route = createFileRoute('/feedback')({ component: FeedbackPage })

function DriverFeedbackBadge({ helpful }: { helpful: boolean | null }) {
  if (helpful === null) {
    return <Badge variant="outline">No feedback yet</Badge>
  }
  return helpful ? (
    <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-500">
      <ThumbsUp />
      Helpful
    </Badge>
  ) : (
    <Badge variant="destructive">
      <ThumbsDown />
      Not helpful
    </Badge>
  )
}

// Editable 0-1 expert score — the paper's feedback module layer 2: a human
// professional's nuanced score (relevance/accuracy/safety/clarity),
// deliberately independent of the driver's layer-1 helpful/not-helpful
// signal shown alongside it.
function ExpertScoreInput({
  row,
  onSaved,
}: {
  row: HistoricalQuery
  onSaved: (updated: HistoricalQuery) => void
}) {
  const [value, setValue] = useState(row.expertScore?.toFixed(2) ?? '')
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    const parsed = Number(value)
    if (value === '' || Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
      setValue(row.expertScore?.toFixed(2) ?? '')
      return
    }
    if (parsed === row.expertScore) return
    setSaving(true)
    try {
      const updated = await setExpertScore(row.id, parsed)
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="—"
        className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-xs tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {saving && <Loader2 className="text-muted-foreground size-3 animate-spin" />}
    </div>
  )
}

function FeedbackPage() {
  const [rows, setRows] = useState<HistoricalQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistoricalQueries()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <p className="text-muted-foreground text-sm">
        Every query/response pair sent to drivers, with the paper's two-layer feedback: layer 1
        is the driver's helpful/not-helpful signal from the vehicle; layer 2 is your expert score
        below — set independently, since an unhelpful-to-the-driver response can still be a
        valuable (low-scored) example. Pairs that reach a top expert score are automatically fed
        back into the knowledge base for future retrieval.
      </p>

      {error && <p className="text-destructive text-sm">Failed to load feedback: {error}</p>}

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareWarning />
            </EmptyMedia>
            <EmptyTitle>No queries yet</EmptyTitle>
            <EmptyDescription>
              Query/response pairs will show up here once vehicles start sending diagnostic
              queries.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Query</TableHead>
              <TableHead>Response</TableHead>
              <TableHead className="w-40">Action</TableHead>
              <TableHead className="w-36">Driver feedback</TableHead>
              <TableHead className="w-28">Expert score</TableHead>
              <TableHead className="w-36">Knowledge base</TableHead>
              <TableHead className="w-40">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-sm whitespace-normal">
                  <Badge variant="outline" className="mb-1 max-w-full truncate">
                    {row.prefix}
                  </Badge>
                  <p className="line-clamp-2 text-xs">{row.queryText}</p>
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal">
                  {row.responseText ? (
                    <p className="line-clamp-2 text-xs">{row.responseText}</p>
                  ) : (
                    <span className="text-muted-foreground text-xs">Not yet generated</span>
                  )}
                </TableCell>
                <TableCell>
                  <ActionBadge deliveryChannel={row.deliveryChannel} />
                </TableCell>
                <TableCell>
                  <DriverFeedbackBadge helpful={row.driverHelpful} />
                </TableCell>
                <TableCell>
                  <ExpertScoreInput
                    row={row}
                    onSaved={(updated) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
                    }
                  />
                </TableCell>
                <TableCell>
                  {row.insertedIntoKnowledgeBase ? (
                    <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-500">
                      <BookmarkCheck />
                      Reinserted
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
