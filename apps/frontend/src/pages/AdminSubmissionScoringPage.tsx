import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from '@tanstack/react-router'
import { fetchSubmissionDetails, updateSubmissionScore } from '@/lib/question-papers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Save, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export function AdminSubmissionScoringPage() {
  const { submissionId } = useParams({ from: '/dashboard/submissions/$submissionId/score' })
  const queryClient = useQueryClient()
  const [localScores, setLocalScores] = useState<Record<string, number>>({})

  const { data: submission, isLoading } = useQuery({
    queryKey: ['submission-details', submissionId],
    queryFn: () => fetchSubmissionDetails(submissionId)
  })

  useEffect(() => {
    if (submission?.questionScores) {
      setLocalScores(submission.questionScores)
    }
  }, [submission])

  const mutation = useMutation({
    mutationFn: (scores: Record<string, number>) => updateSubmissionScore(submissionId, scores),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission-details', submissionId] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      toast.success('Scores updated successfully')
    },
    onError: () => {
      toast.error('Failed to update scores')
    }
  })

  const handleScoreChange = (questionId: string, score: number, maxMarks: number) => {
    const val = Math.min(Math.max(0, score), maxMarks)
    setLocalScores(prev => ({ ...prev, [questionId]: val }))
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!submission) return <div>Submission not found</div>

  const totalScore = Object.values(localScores).reduce((acc, score) => acc + score, 0)
  const maxPossibleScore = submission.version.questions?.reduce((acc, q) => acc + q.marks, 0) || 0

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard/submissions/specialization/$specializationId"
            params={{ specializationId: submission.version.paper.specializationId }}
          >
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scoring: {submission.user.name}</h1>
            <p className="text-muted-foreground">
              {submission.version.paper.title} - {submission.version.versionName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground">Total Score</div>
            <div className="text-2xl font-bold">
              {totalScore} / {maxPossibleScore}
            </div>
          </div>
          <Button
            onClick={() => mutation.mutate(localScores)}
            disabled={mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Scores
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8">
          {(() => {
            const questions = submission.version.questions ?? []
            const sections = [...(submission.version.sections ?? [])].sort((a, b) => a.order - b.order)
            // Group flat questions by sectionId, preserving each section's
            // own order; questions with no sectionId (older papers seeded
            // before sections existed) fall into a single unlabeled group.
            const bySectionId = new Map<string, typeof questions>()
            const unsectioned: typeof questions = []
            for (const q of questions) {
              if (q.sectionId) {
                if (!bySectionId.has(q.sectionId)) bySectionId.set(q.sectionId, [])
                bySectionId.get(q.sectionId)!.push(q)
              } else {
                unsectioned.push(q)
              }
            }

            const groups: { id: string; title?: string; description?: string; questions: typeof questions }[] = sections.map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              questions: bySectionId.get(s.id) ?? [],
            }))
            if (unsectioned.length > 0) {
              groups.push({ id: 'unsectioned', questions: unsectioned })
            }

            let runningIndex = 0

            return groups.map((group) => (
              <div key={group.id} className="space-y-4">
                {group.title && (
                  <div className="border-b pb-2">
                    <h2 className="text-lg font-bold tracking-tight">{group.title}</h2>
                    {group.description && <p className="text-sm text-muted-foreground mt-0.5">{group.description}</p>}
                  </div>
                )}
                {group.questions.map((question) => {
                  runningIndex += 1
                  const index = runningIndex - 1
                  const studentAnswer = submission.answers?.[question.id]
                  const isMCQ = question.type === 'MCQ'
                  const currentScore = localScores[question.id] || 0
                  const isCorrect = isMCQ && studentAnswer === question.answer
                  // Multi-part questions store answers and marks per sub-question;
                  // the parent's marks are the sum of its parts.
                  const subQuestions = question.subQuestions ?? []

                  return (
                    <Card key={question.id} className={isMCQ ? (isCorrect ? 'border-green-200 bg-green-50/10' : 'border-red-200 bg-red-50/10') : ''}>
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">Q{index + 1}.</span>
                            <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
                            {isMCQ && (
                              isCorrect ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                                  <XCircle className="mr-1 h-3 w-3" /> Incorrect
                                </Badge>
                              )
                            )}
                          </div>
                          <div className="text-lg font-medium pt-1">{question.text}</div>
                        </div>
                        {subQuestions.length === 0 && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Marks:</span>
                            <Input
                              type="number"
                              className="w-20 h-8"
                              value={currentScore}
                              onChange={(e) => handleScoreChange(question.id, parseInt(e.target.value) || 0, question.marks)}
                              readOnly={isMCQ} // MCQs are auto-scored, though admin can still override if we remove this
                            />
                            <span className="text-sm text-muted-foreground">/ {question.marks}</span>
                          </div>
                        </div>
                        )}
                        {subQuestions.length > 0 && (
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {subQuestions.reduce((acc, sq) => acc + (localScores[sq.id] || 0), 0)} / {question.marks}
                          </span>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        {subQuestions.length > 0 ? (
                          <div className="space-y-4">
                            {subQuestions.map((sq) => (
                              <div key={sq.id} className="space-y-2 border-l-2 pl-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm font-medium whitespace-pre-wrap">{sq.text}</div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm font-medium">Marks:</span>
                                    <Input
                                      type="number"
                                      className="w-20 h-8"
                                      value={localScores[sq.id] || 0}
                                      onChange={(e) => handleScoreChange(sq.id, parseInt(e.target.value) || 0, sq.marks)}
                                    />
                                    <span className="text-sm text-muted-foreground">/ {sq.marks}</span>
                                  </div>
                                </div>
                                <div className="rounded-md bg-muted p-3">
                                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Student's Answer</div>
                                  <div className="whitespace-pre-wrap">
                                    {submission.answers?.[sq.id] || <span className="italic text-muted-foreground">No answer provided</span>}
                                  </div>
                                </div>
                                {sq.answer && (
                                  <div className="rounded-md border border-green-100 bg-green-50/30 p-3">
                                    <div className="text-xs font-semibold uppercase text-green-700 mb-1">Correct Answer / Reference</div>
                                    <div className="text-sm whitespace-pre-wrap">{sq.answer}</div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                        <div className="space-y-3">
                          <div className="rounded-md bg-muted p-3">
                            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Student's Answer</div>
                            <div className="whitespace-pre-wrap">
                              {isMCQ ? (
                                <div className="flex flex-col gap-1">
                                  {question.options?.map((opt: any) => (
                                    <div key={opt.id} className={`flex items-center gap-2 text-sm ${studentAnswer === opt.id ? 'font-bold' : ''}`}>
                                      <div className={`h-2 w-2 rounded-full ${studentAnswer === opt.id ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                                      {opt.text}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                studentAnswer || <span className="italic text-muted-foreground">No answer provided</span>
                              )}
                            </div>
                          </div>

                          {question.answer && (
                            <div className="rounded-md border border-green-100 bg-green-50/30 p-3">
                              <div className="text-xs font-semibold uppercase text-green-700 mb-1">Correct Answer / Reference</div>
                              <div className="text-sm whitespace-pre-wrap">
                                {isMCQ ? (
                                  question.options?.find((opt: any) => opt.id === question.answer)?.text
                                ) : (
                                  question.answer
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ))
          })()}
        </div>

        {/* Proctoring Timeline Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Proctoring Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submission.answers?._proctoringLogs && Array.isArray(submission.answers._proctoringLogs) && submission.answers._proctoringLogs.length > 0 ? (
                  <div className="relative border-l-2 border-muted ml-2 pl-4 space-y-6">
                    {submission.answers._proctoringLogs.map((log: any, i: number) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white ${log.type === 'AWAY' ? 'bg-red-500' : 'bg-green-500'}`} />
                        <div className="text-xs font-bold text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-sm font-medium">
                          {log.type === 'AWAY' ? (
                            <span className="text-red-600">Left Test Tab</span>
                          ) : (
                            <span className="text-green-600">Returned to Test</span>
                          )}
                        </div>
                        {log.durationSeconds !== undefined && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Duration: <span className="font-bold text-foreground">{log.durationSeconds}s</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-sm font-medium">No Tab Switching Detected</p>
                    <p className="text-xs text-muted-foreground">The student stayed on the test page for the entire duration.</p>
                  </div>
                )}
                
                <div className="pt-4 border-t mt-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                    <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                      <strong>Pro-tip:</strong> Use these timestamps to cross-reference with the screen recording. Focus on "Away" periods longer than 10 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
