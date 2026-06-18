import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { Loader2, Search, Save, Star, Eye, Calendar } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getActiveRole, type AuthUser } from '@/lib/auth'
import {
  fetchCompanyCandidates,
  updateCompanyCandidateDecision,
  type CompanyActionStatus,
  type CompanyCandidateRecord,
  type CompanyWorkflowStatus,
} from '@/lib/company'
import { companyScheduleInterview } from '@/lib/interview'
import { cn } from '@/lib/utils'

type DraftState = Record<
  string,
  {
    status: CompanyActionStatus | ''
    notes: string
  }
>

const emptyCandidates: CompanyCandidateRecord[] = []
const actionStatuses: CompanyActionStatus[] = ['SHORTLISTED', 'CONTACTED', 'INTERVIEWING', 'OFFERED', 'REJECTED']

function statusBadgeClass(status: CompanyWorkflowStatus) {
  switch (status) {
    case 'SHORTLISTED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'CONTACTED':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'INTERVIEWING':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    case 'OFFERED':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'REJECTED':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground'
  }
}

function formatStatus(status: CompanyWorkflowStatus) {
  return status.replace('_', ' ')
}

function buildDrafts(candidates: CompanyCandidateRecord[]) {
  return candidates.reduce<DraftState>((acc, candidate) => {
    acc[candidate.attemptId] = {
      status: candidate.workflowStatus === 'NEW' ? '' : candidate.workflowStatus,
      notes: candidate.notes ?? '',
    }
    return acc
  }, {})
}

export function CompanyDashboardPage() {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  }) as unknown as AuthUser
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [campaign, setCampaign] = useState('all')
  const [practiceArea, setPracticeArea] = useState('all')
  const [status, setStatus] = useState<CompanyWorkflowStatus | 'all'>('all')
  const [drafts, setDrafts] = useState<DraftState>({})
  const [selectedCandidate, setSelectedCandidate] = useState<CompanyCandidateRecord | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [scheduleNotes, setScheduleNotes] = useState<string>('')

  const role = user ? getActiveRole(user) : 'USER'
  const isCompany = role === 'COMPANY'

  const query = useQuery({
    queryKey: ['company-candidates', { search, campaign, practiceArea, status }],
    queryFn: () =>
      fetchCompanyCandidates({
        search: search.trim() || undefined,
        campaign: campaign === 'all' ? undefined : campaign,
        domain: practiceArea === 'all' ? undefined : practiceArea,
        status: status === 'all' ? undefined : status,
      }),
    enabled: isCompany,
  })

  useEffect(() => {
    if (query.data) {
      setDrafts(buildDrafts(query.data))
    }
  }, [query.data])

  const visibleCandidates = query.data ?? emptyCandidates

  const filterOptions = useMemo(() => {
    const campaigns = new Set<string>()
    const domains = new Set<string>()

    visibleCandidates.forEach((candidate) => {
      campaigns.add(candidate.campaign)
      domains.add(candidate.practiceArea)
    })

    return {
      campaigns: Array.from(campaigns).sort((left, right) => left.localeCompare(right)),
      domains: Array.from(domains).sort((left, right) => left.localeCompare(right)),
    }
  }, [visibleCandidates])

  const summary = useMemo(() => {
    const total = visibleCandidates.length
    const shortlisted = visibleCandidates.filter((candidate) => candidate.workflowStatus === 'SHORTLISTED').length
    const inPlay = visibleCandidates.filter(
      (candidate) => candidate.workflowStatus === 'CONTACTED' || candidate.workflowStatus === 'INTERVIEWING' || candidate.workflowStatus === 'OFFERED',
    ).length
    const rejected = visibleCandidates.filter((candidate) => candidate.workflowStatus === 'REJECTED').length
    const averageMarks = total > 0 ? Math.round(visibleCandidates.reduce((acc, candidate) => acc + candidate.marks, 0) / total) : 0

    return { total, shortlisted, inPlay, rejected, averageMarks }
  }, [visibleCandidates])

  const saveMutation = useMutation({
    mutationFn: async (payload: { attemptId: string; status: CompanyActionStatus; notes: string }) =>
      updateCompanyCandidateDecision(payload.attemptId, {
        status: payload.status,
        notes: payload.notes.trim() || undefined,
      }),
    onSuccess: async (updatedCandidate) => {
      await queryClient.invalidateQueries({ queryKey: ['company-candidates'] })
      setDrafts((current) => ({
        ...current,
        [updatedCandidate.attemptId]: {
          status: updatedCandidate.workflowStatus === 'NEW' ? '' : (updatedCandidate.workflowStatus as CompanyActionStatus),
          notes: updatedCandidate.notes ?? '',
        },
      }))
      toast.success('Candidate workflow updated')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not update candidate')
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: async (payload: { studentId: string; scheduledAt: string; notes?: string }) =>
      companyScheduleInterview(payload.studentId, payload.scheduledAt, payload.notes),
    onSuccess: () => {
      toast.success('Interview scheduled successfully')
      setIsScheduleOpen(false)
      setScheduledAt('')
      setScheduleNotes('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not schedule interview')
    },
  })

  if (!user) return null

  if (!isCompany) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Switch to the Company role to view the candidate directory.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Company Dashboard
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Candidate directory</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review assessed students by student ID, marks, and practice area. Use shortlist workflow states to keep the hiring pipeline organized.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:min-w-[420px] lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Students</div>
              <div className="mt-2 text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shortlisted</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">{summary.shortlisted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">In pipeline</div>
              <div className="mt-2 text-2xl font-bold text-blue-600">{summary.inPlay}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Avg marks</div>
              <div className="mt-2 text-2xl font-bold">{summary.averageMarks}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Student ID or campaign"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Campaign</Label>
            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {filterOptions.campaigns.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Practice area</Label>
            <Select value={practiceArea} onValueChange={setPracticeArea}>
              <SelectTrigger>
                <SelectValue placeholder="All practice areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All practice areas</SelectItem>
                {filterOptions.domains.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as CompanyWorkflowStatus | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                {actionStatuses.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatStatus(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading candidates...
            </div>
          ) : visibleCandidates.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-center text-muted-foreground">
              No candidates match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Practice Area</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCandidates.map((candidate) => {
                    const draft = drafts[candidate.attemptId] ?? {
                      status: candidate.workflowStatus === 'NEW' ? '' : (candidate.workflowStatus as CompanyActionStatus),
                      notes: candidate.notes ?? '',
                    }

                    const canSave = Boolean(draft.status) && !saveMutation.isPending
                    return (
                      <TableRow key={candidate.attemptId}>
                        <TableCell className="font-mono text-sm">{candidate.studentId}</TableCell>
                        <TableCell>{candidate.practiceArea}</TableCell>
                        <TableCell>{candidate.campaign}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <div className="flex items-center justify-end gap-2">
                            {candidate.marks}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedCandidate(candidate)
                                setIsDetailsOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="space-y-2">
                            <Badge className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadgeClass(candidate.workflowStatus))}>
                              {formatStatus(candidate.workflowStatus)}
                            </Badge>
                            <Select
                              value={draft.status}
                              onValueChange={(value) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [candidate.attemptId]: {
                                    ...draft,
                                    status: value as CompanyActionStatus,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Set status" />
                              </SelectTrigger>
                              <SelectContent>
                                {actionStatuses.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {formatStatus(option)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[240px]">
                          <Textarea
                            value={draft.notes}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [candidate.attemptId]: {
                                  ...draft,
                                  notes: event.target.value,
                                },
                              }))
                            }
                            placeholder="Add a short note"
                            rows={2}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  saveMutation.mutate({
                                    attemptId: candidate.attemptId,
                                    status: 'SHORTLISTED',
                                    notes: draft.notes,
                                  })
                                }
                                disabled={saveMutation.isPending}
                              >
                                <Star className="mr-2 h-4 w-4" />
                                Shortlist
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  saveMutation.mutate({
                                    attemptId: candidate.attemptId,
                                    status: draft.status || 'SHORTLISTED',
                                    notes: draft.notes,
                                  })
                                }
                                disabled={!canSave}
                              >
                                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                              </Button>
                            </div>
                            {candidate.workflowStatus === 'INTERVIEWING' && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  setSelectedCandidate(candidate)
                                  setIsScheduleOpen(true)
                                }}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule Interview
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Marks Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Candidate Profile Details</DialogTitle>
            <DialogDescription>
              Detailed performance metrics for Student ID: <span className="font-mono font-bold">{selectedCandidate?.studentId}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <h3 className="text-lg font-semibold border-b pb-1">Assessment Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Total Assessment Score</div>
                  <div className="text-2xl font-bold">{selectedCandidate?.marks}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Domain</div>
                  <div className="text-lg font-medium">{selectedCandidate?.practiceArea}</div>
                </div>
              </div>
              
              <div className="mt-2">
                <div className="text-sm text-muted-foreground mb-2">Question-wise Breakdown</div>
                <div className="rounded-md border p-4 max-h-40 overflow-y-auto">
                  {selectedCandidate && Object.entries(selectedCandidate.questionScores).length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      {Object.entries(selectedCandidate.questionScores).map(([qId, score], idx) => (
                        <div key={qId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Question {idx + 1}</span>
                          <span className="font-mono font-medium">{score} marks</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No detailed breakdown available</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <h3 className="text-lg font-semibold border-b pb-1">Interview Performance</h3>
              {selectedCandidate?.interviewMarks !== undefined && selectedCandidate?.interviewMarks !== null ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Interview Score</div>
                      <div className="text-2xl font-bold text-violet-600">{selectedCandidate?.interviewMarks}</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Interviewer Comments</div>
                    <div className="rounded-md bg-muted p-3 text-sm italic">
                      "{selectedCandidate?.interviewerComments || 'No comments provided'}"
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground italic bg-muted/50 p-4 rounded-md text-center">
                  Interview results not yet available.
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Schedule your own hiring interview for Student ID: <span className="font-mono font-bold">{selectedCandidate?.studentId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="scheduledAt">Date &amp; time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scheduleNotes">Notes (optional)</Label>
              <Textarea
                id="scheduleNotes"
                value={scheduleNotes}
                onChange={(event) => setScheduleNotes(event.target.value)}
                placeholder="Add any notes for this interview"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button
              disabled={!scheduledAt || scheduleMutation.isPending}
              onClick={() => {
                if (selectedCandidate && scheduledAt) {
                  scheduleMutation.mutate({
                    studentId: selectedCandidate.studentId,
                    scheduledAt: new Date(scheduledAt).toISOString(),
                    notes: scheduleNotes.trim() || undefined,
                  })
                }
              }}
            >
              {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
