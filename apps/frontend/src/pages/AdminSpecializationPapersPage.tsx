import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'

import {
  fetchPapers,
  createPaper,
  updatePaper,
  deletePaper,
  createVersion,
  renameVersion,
  deleteVersion,
} from '@/lib/question-papers'
import type { QuestionPaper, QuestionPaperVersion } from '@/lib/question-papers'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'PUBLISHED') return 'default'
  if (status === 'ARCHIVED') return 'secondary'
  return 'outline'
}

// ── Version sub-table ─────────────────────────────────────────────────────────
function VersionsTable({
  paper,
  onRefresh,
}: {
  paper: QuestionPaper
  specializationId: string
  onRefresh: () => Promise<void>
}) {
  const [newVersionName, setNewVersionName] = React.useState('')
  const [editingVersionId, setEditingVersionId] = React.useState<string | null>(null)
  const [draftVersionName, setDraftVersionName] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) return
    setBusy(true)
    try {
      await createVersion(paper.id, newVersionName.trim())
      setNewVersionName('')
      await onRefresh()
      toast.success('Version created')
    } catch {
      toast.error('Failed to create version')
    } finally {
      setBusy(false)
    }
  }

  const handleRenameVersion = async (versionId: string) => {
    if (!draftVersionName.trim()) return
    setBusy(true)
    try {
      await renameVersion(versionId, draftVersionName.trim())
      setEditingVersionId(null)
      setDraftVersionName('')
      await onRefresh()
      toast.success('Version renamed')
    } catch {
      toast.error('Failed to rename version')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteVersion = async (version: QuestionPaperVersion) => {
    if (!window.confirm(`Delete version "${version.versionName}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deleteVersion(version.id)
      await onRefresh()
      toast.success('Version deleted')
    } catch {
      toast.error('Failed to delete version')
    } finally {
      setBusy(false)
    }
  }

  const versions = paper.versions ?? []

  return (
    <div className="space-y-3 pt-1">
      {/* Add version */}
      <div className="flex gap-2">
        <Input
          value={newVersionName}
          onChange={(e) => setNewVersionName(e.target.value)}
          placeholder="E.g. Q1 2026"
          className="max-w-xs h-8 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateVersion() }}
        />
        <Button size="sm" variant="secondary" onClick={handleCreateVersion} disabled={busy || !newVersionName.trim()}>
          Add Version
        </Button>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No versions yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => (
              <TableRow key={version.id}>
                <TableCell>
                  {editingVersionId === version.id ? (
                    <Input
                      value={draftVersionName}
                      onChange={(e) => setDraftVersionName(e.target.value)}
                      className="h-7 max-w-xs text-sm"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium">{version.versionName}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(version.status)}>{version.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {editingVersionId === version.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy || !draftVersionName.trim()}
                          onClick={() => void handleRenameVersion(version.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingVersionId(null); setDraftVersionName('') }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link to="/dashboard/papers/$versionId/builder" params={{ versionId: version.id }}>
                          <Button size="sm" variant="outline">Open Builder</Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Version actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingVersionId(version.id)
                                setDraftVersionName(version.versionName)
                              }}
                            >
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => void handleDeleteVersion(version)}
                            >
                              Delete Version
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminSpecializationPapersPage() {
  const { specializationId } = useParams({ strict: false }) as { specializationId: string }
  const [papers, setPapers] = React.useState<QuestionPaper[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [newTitle, setNewTitle] = React.useState('')
  const [editingPaperId, setEditingPaperId] = React.useState<string | null>(null)
  const [draftTitle, setDraftTitle] = React.useState('')
  const [savingPaperId, setSavingPaperId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPapers(specializationId)
      setPapers(data)
    } catch {
      toast.error('Failed to load papers')
    } finally {
      setLoading(false)
    }
  }, [specializationId])

  React.useEffect(() => { void load() }, [load])

  const filteredPapers = React.useMemo(() => {
    const s = query.trim().toLowerCase()
    if (!s) return papers
    return papers.filter((p) => p.title.toLowerCase().includes(s))
  }, [papers, query])

  const handleCreatePaper = async () => {
    if (!newTitle.trim()) return
    try {
      await createPaper(specializationId, newTitle.trim())
      setNewTitle('')
      await load()
      toast.success('Paper created')
    } catch {
      toast.error('Failed to create paper')
    }
  }

  const handleUpdatePaper = async (paper: QuestionPaper) => {
    if (!draftTitle.trim()) return
    setSavingPaperId(paper.id)
    try {
      const updated = await updatePaper(specializationId, paper.id, { title: draftTitle.trim() })
      setPapers((prev) => prev.map((p) => (p.id === updated.id ? { ...p, title: updated.title } : p)))
      setEditingPaperId(null)
      setDraftTitle('')
      toast.success('Paper renamed')
    } catch {
      toast.error('Failed to rename paper')
    } finally {
      setSavingPaperId(null)
    }
  }

  const handleDeletePaper = async (paper: QuestionPaper) => {
    if (!window.confirm(`Delete "${paper.title}"? All versions and questions will be lost.`)) return
    setSavingPaperId(paper.id)
    try {
      await deletePaper(specializationId, paper.id)
      setPapers((prev) => prev.filter((p) => p.id !== paper.id))
      toast.success('Paper deleted')
    } catch {
      toast.error('Failed to delete paper')
    } finally {
      setSavingPaperId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Question Papers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage papers and their versions for this specialization.
            </p>
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search papers..."
            className="w-full md:max-w-sm"
          />
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Create paper */}
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New paper title"
              className="max-w-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreatePaper() }}
            />
            <Button onClick={handleCreatePaper} disabled={!newTitle.trim()}>
              Add Paper
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading papers...</p>
          ) : filteredPapers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No papers found.</p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredPapers.map((paper) => (
                <AccordionItem
                  key={paper.id}
                  value={paper.id}
                  className="border rounded-lg px-4"
                >
                  <div className="flex items-center gap-3 py-1">
                    {/* Inline rename or trigger */}
                    {editingPaperId === paper.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          className="h-8 max-w-xs"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') void handleUpdatePaper(paper) }}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={savingPaperId === paper.id || !draftTitle.trim()}
                          onClick={() => void handleUpdatePaper(paper)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingPaperId(null); setDraftTitle('') }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <AccordionTrigger className="flex-1 hover:no-underline py-3">
                        <div className="flex items-center gap-3 text-left">
                          <span className="font-medium">{paper.title}</span>
                          <Badge variant="outline" className="text-xs font-normal">
                            {paper.versions?.length ?? 0} version{(paper.versions?.length ?? 0) !== 1 ? 's' : ''}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(paper.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </AccordionTrigger>
                    )}

                    {/* Paper actions dropdown — always visible */}
                    {editingPaperId !== paper.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Paper actions">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => { setEditingPaperId(paper.id); setDraftTitle(paper.title) }}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => void handleDeletePaper(paper)}
                          >
                            Delete Paper
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <AccordionContent className="pb-4">
                    <VersionsTable
                      paper={paper}
                      specializationId={specializationId}
                      onRefresh={load}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
