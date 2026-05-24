import React from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { fetchPapers, createPaper, createVersion } from '@/lib/question-papers'
import type { QuestionPaper } from '@/lib/question-papers'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function AdminSpecializationPapersPage() {
  const { specializationId } = useParams({ strict: false }) as { specializationId: string }
  const [papers, setPapers] = React.useState<QuestionPaper[]>([])
  const [newTitle, setNewTitle] = React.useState('')
  const [expandedPaper, setExpandedPaper] = React.useState<string | null>(null)
  const [newVersionName, setNewVersionName] = React.useState('')

  const load = React.useCallback(async () => {
    try {
      const data = await fetchPapers(specializationId)
      setPapers(data)
    } catch (e) {
      toast.error('Failed to load papers')
    }
  }, [specializationId])

  React.useEffect(() => {
    void load()
  }, [load])

  const handleCreatePaper = async () => {
    if (!newTitle.trim()) return
    try {
      await createPaper(specializationId, newTitle)
      setNewTitle('')
      await load()
      toast.success('Paper created')
    } catch {
      toast.error('Failed to create paper')
    }
  }

  const handleCreateVersion = async (paperId: string) => {
    if (!newVersionName.trim()) return
    try {
      await createVersion(paperId, newVersionName)
      setNewVersionName('')
      await load()
      toast.success('Version created')
    } catch {
      toast.error('Failed to create version')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Question Papers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New paper title" />
            <Button onClick={handleCreatePaper}>Add Paper</Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {papers.map((paper) => (
                  <React.Fragment key={paper.id}>
                    <TableRow>
                      <TableCell className="font-medium">{paper.title}</TableCell>
                      <TableCell>{new Date(paper.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedPaper(expandedPaper === paper.id ? null : paper.id)}
                        >
                          {expandedPaper === paper.id ? 'Hide Versions' : 'Manage Versions'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedPaper === paper.id && (
                      <TableRow>
                        <TableCell colSpan={3} className="bg-muted/50 p-4">
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold">Versions</h4>
                            <div className="flex gap-2">
                              <Input
                                value={newVersionName}
                                onChange={(e) => setNewVersionName(e.target.value)}
                                placeholder="E.g., Q1 2026"
                                className="max-w-xs"
                              />
                              <Button variant="secondary" onClick={() => handleCreateVersion(paper.id)}>Add Version</Button>
                            </div>
                            {paper.versions && paper.versions.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paper.versions.map((version) => (
                                    <TableRow key={version.id}>
                                      <TableCell>{version.versionName}</TableCell>
                                      <TableCell>{version.status}</TableCell>
                                      <TableCell>
                                        <Link to="/dashboard/papers/$versionId/builder" params={{ versionId: version.id }}>
                                          <Button size="sm">Open Builder</Button>
                                        </Link>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground">No versions found.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
