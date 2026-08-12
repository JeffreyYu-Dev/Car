import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BookOpen, Loader2, Trash2, Upload } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  clearKnowledgeBase,
  deleteKnowledgeEntry,
  fetchKnowledgeEntries,
  ingestKnowledgeText,
  uploadKnowledgeFile,
  type KnowledgeEntry,
  type KnowledgeSourceType,
} from '#/lib/api'

export const Route = createFileRoute('/knowledge')({ component: KnowledgePage })

const SOURCE_TYPE_OPTIONS: { value: KnowledgeSourceType; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'service_bulletin', label: 'Service bulletin' },
  { value: 'recall_notice', label: 'Recall notice' },
  { value: 'forum', label: 'Forum thread' },
  { value: 'other', label: 'Other' },
]

// Plain <select>/<textarea>, styled to match the Input component — the
// dashboard doesn't have shadcn Select/Textarea primitives installed yet
// and this page doesn't need anything fancier.
const fieldClass =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'

function SourceTypeSelect({
  value,
  onChange,
}: {
  value: KnowledgeSourceType
  onChange: (value: KnowledgeSourceType) => void
}) {
  return (
    <select
      className={fieldClass}
      value={value}
      onChange={(e) => onChange(e.target.value as KnowledgeSourceType)}
    >
      {SOURCE_TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function TextIngestForm({ onIngested }: { onIngested: () => void }) {
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')
  const [sourceType, setSourceType] = useState<KnowledgeSourceType>('manual')
  const [reliabilityScore, setReliabilityScore] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await ingestKnowledgeText({
        content,
        source: source.trim() || undefined,
        sourceType,
        reliabilityScore,
      })
      setContent('')
      setSource('')
      onIngested()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest text')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        className={`${fieldClass} min-h-32 resize-y py-2`}
        placeholder="Paste a manual excerpt, service bulletin, recall notice, or forum thread…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          placeholder="Source (e.g. '2019 Corolla Manual, Ch. 4')"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <SourceTypeSelect value={sourceType} onChange={setSourceType} />
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={reliabilityScore}
          onChange={(e) => setReliabilityScore(Number(e.target.value))}
        />
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
          {submitting ? <Loader2 className="animate-spin" /> : <BookOpen />}
          Add to knowledge base
        </Button>
      </div>
    </form>
  )
}

function FileUploadForm({ onIngested }: { onIngested: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState('')
  const [sourceType, setSourceType] = useState<KnowledgeSourceType>('manual')
  const [reliabilityScore, setReliabilityScore] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    setError(null)
    try {
      await uploadKnowledgeFile({
        file,
        source: source.trim() || undefined,
        sourceType,
        reliabilityScore,
      })
      setFile(null)
      setSource('')
      onIngested()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="file"
        accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
        className={`${fieldClass} pt-1.5`}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <p className="text-muted-foreground text-xs">PDF, .txt, or .md — up to 20MB.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          placeholder="Source (defaults to file name)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <SourceTypeSelect value={sourceType} onChange={setSourceType} />
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={reliabilityScore}
          onChange={(e) => setReliabilityScore(Number(e.target.value))}
        />
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={submitting || !file}>
          {submitting ? <Loader2 className="animate-spin" /> : <Upload />}
          Upload
        </Button>
      </div>
    </form>
  )
}

function sourceTypeLabel(type: KnowledgeSourceType): string {
  return SOURCE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

function EntriesTable({
  entries,
  onDelete,
}: {
  entries: KnowledgeEntry[]
  onDelete: (id: number) => void
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteKnowledgeEntry(id)
      onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>Knowledge base is empty</EmptyTitle>
          <EmptyDescription>
            Paste text or upload a manual above — it'll be chunked, embedded, and become
            retrievable by the query pipeline immediately.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Content</TableHead>
          <TableHead className="w-48">Source</TableHead>
          <TableHead className="w-32">Type</TableHead>
          <TableHead className="w-20">Reliability</TableHead>
          <TableHead className="w-40">Added</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="max-w-md truncate whitespace-normal">
              <span className="line-clamp-2 text-xs">{entry.content}</span>
            </TableCell>
            <TableCell className="text-muted-foreground truncate text-xs">
              {entry.source ?? '—'}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{sourceTypeLabel(entry.sourceType)}</Badge>
            </TableCell>
            <TableCell className="text-xs tabular-nums">
              {entry.reliabilityScore.toFixed(2)}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {new Date(entry.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={deletingId === entry.id}
                onClick={() => handleDelete(entry.id)}
              >
                {deletingId === entry.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 className="text-destructive" />
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Wipes every knowledge base entry (Postgres rows + Qdrant collection) in
// one shot. Destructive and irreversible, so it's gated behind a native
// confirm() — this dashboard has no dialog primitive installed, and a
// browser confirm is enough friction for an internal tool.
function ClearKnowledgeBaseButton({
  disabled,
  onCleared,
}: {
  disabled: boolean
  onCleared: () => void
}) {
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClear() {
    if (!window.confirm('Delete every entry in the knowledge base? This cannot be undone.')) {
      return
    }
    setClearing(true)
    setError(null)
    try {
      await clearKnowledgeBase()
      onCleared()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear knowledge base')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={disabled || clearing}
        onClick={handleClear}
      >
        {clearing ? <Loader2 className="animate-spin" /> : <Trash2 />}
        Clear knowledge base
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function reload() {
    fetchKnowledgeEntries()
      .then((data) => {
        setEntries(data)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Add material to the RAG knowledge base — manuals, service bulletins, recall notices,
          forum threads. Long documents are automatically chunked and embedded so the query
          pipeline can retrieve the most relevant passage instead of a whole document.
        </p>
        <ClearKnowledgeBaseButton
          disabled={loading || entries.length === 0}
          onCleared={() => setEntries([])}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Paste text</CardTitle>
          </CardHeader>
          <CardContent>
            <TextIngestForm onIngested={reload} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Upload a file</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploadForm onIngested={reload} />
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-destructive text-sm">Failed to load entries: {error}</p>}

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <EntriesTable
          entries={entries}
          onDelete={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
        />
      )}
    </div>
  )
}
