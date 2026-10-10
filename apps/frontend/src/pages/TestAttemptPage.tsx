import React from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import {
  fetchStudentVersionDetails,
  type QuestionPaper,
  type QuestionPaperVersion,
  type Question,
  type PaperSection,
  type SectionRules,
  startTestAttempt,
  submitTestAttempt,
  saveTestAnswers,
  fetchAttemptStatus,
} from '@/lib/question-papers'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAntiCheat } from '@/hooks/use-anti-cheat'
import { AntiCheatMonitor } from '@/components/anti-cheat-monitor'
import { ViolationWarning } from '@/components/violation-warning'
import { Loader2 } from 'lucide-react'

// ─── Markdown renderer (minimal, no extra deps) ────────────────────────────
function renderMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-heading font-bold mb-4 mt-8 text-foreground">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-heading font-bold mb-3 mt-6 text-foreground">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-heading font-bold mb-2 mt-4 text-foreground">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/^---$/gm, '<hr class="border-t border-border/60 my-8"/>')
    .replace(/^- (.+)$/gm, '<li class="ml-6 mb-2 list-disc text-muted-foreground">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 mb-2 list-decimal text-muted-foreground">$1</li>')
    .replace(/^(?!<[hlid])(.+)$/gm, '<p class="mb-4 text-muted-foreground leading-relaxed">$1</p>')
    .replace(/\n/g, '')
}

// ─── Word count helper ─────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

// ─── Section badge ─────────────────────────────────────────────────────────
function SectionBadge({ rules }: { rules?: SectionRules }) {
  if (!rules) return null
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
        backgroundColor: rules.allowExternalResources ? '#dcfce7' : '#fee2e2',
        color: rules.allowExternalResources ? '#15803d' : '#dc2626'
      }}>
        {rules.allowExternalResources ? '✓ Open-book' : '✗ Closed-book'}
      </span>
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
        backgroundColor: rules.allowTabSwitching ? '#dcfce7' : '#fef9c3',
        color: rules.allowTabSwitching ? '#15803d' : '#854d0e'
      }}>
        {rules.allowTabSwitching ? '✓ Tab switching allowed' : '⚠ No tab switching'}
      </span>
      {(rules.wordLimit ?? 0) > 0 && (
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
          Max {rules.wordLimit} words/answer
        </span>
      )}
      {(rules.timeLimitSeconds ?? 0) > 0 && (
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#fdf4ff', color: '#7e22ce' }}>
          {rules.timeLimitSeconds}s per question
        </span>
      )}
      {(rules.questionsToAttempt ?? 0) > 0 && (
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#92400e' }}>
          Attempt {rules.questionsToAttempt}
        </span>
      )}
    </div>
  )
}

export function TestAttemptPage() {
  const params = useParams({ strict: false }) as { versionId?: string }
  const versionId = params?.versionId
  const navigate = useNavigate()

  const [version, setVersion] = React.useState<(QuestionPaperVersion & { paper: QuestionPaper }) | null>(null)
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [currentSubIndex, setCurrentSubIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null)
  const [questionTimeLeft, setQuestionTimeLeft] = React.useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  // Deadline on the local clock, corrected for server skew. The countdown is
  // derived from it on every tick so throttled background tabs can't drift.
  const deadlineRef = React.useRef<number | null>(null)
  const submittingRef = React.useRef(false)
  const autoSubmitFiredRef = React.useRef(false)
  const [hasOngoingAttempt, setHasOngoingAttempt] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [phase, setPhase] = React.useState<'instructions' | 'security' | 'test'>('instructions')
  const [cancelledSections, setCancelledSections] = React.useState<Set<string>>(new Set())
  const [submittedSections, setSubmittedSections] = React.useState<Set<string>>(new Set())
  const [pendingNavigation, setPendingNavigation] = React.useState<{idx: number, subIdx: number} | null>(null)
  const timeSpentRef = React.useRef<Record<string, number>>({})

  // Get current section for the active question
  const currentQuestion = questions[currentIndex]
  const currentSection: PaperSection | undefined = React.useMemo(() => {
    if (!version?.sections || !currentQuestion) return undefined
    return version.sections.find(s => s.questions?.some(q => q.id === currentQuestion?.id))
  }, [version, currentQuestion])
  const currentRules: SectionRules | undefined = currentSection?.rules as SectionRules | undefined

  const antiCheat = useAntiCheat(currentRules)

  const handleNavigate = (idx: number, subIdx: number = 0) => {
    if (idx === currentIndex && subIdx === currentSubIndex) return
    if (idx < 0 || idx >= questions.length) return
    const targetQuestion = questions[idx]
    const targetSection = version?.sections?.find(s => s.questions?.some(q => q.id === targetQuestion?.id))
    
    if (targetSection && submittedSections.has(targetSection.id)) {
      toast.error("You cannot navigate back to a submitted section.")
      return
    }

    if (currentSection && targetSection && currentSection.id !== targetSection.id) {
      setPendingNavigation({ idx, subIdx })
      return
    }

    setCurrentIndex(idx)
    setCurrentSubIndex(subIdx)
  }

  const confirmNavigation = () => {
    if (pendingNavigation !== null && currentSection) {
      setSubmittedSections(prev => {
        const next = new Set(prev).add(currentSection.id)
        const payload = { ...answers, _timeSpent: timeSpentRef.current, _submittedSections: Array.from(next) }
        setIsSaving(true)
        saveTestAnswers(versionId!, payload).then(() => setLastSaved(new Date())).catch(console.error).finally(() => setIsSaving(false))
        return next
      })
      setCurrentIndex(pendingNavigation.idx)
      setCurrentSubIndex(pendingNavigation.subIdx)
      setPendingNavigation(null)
    }
  }

  // ─── Load version ──────────────────────────────────────────────────────
  React.useEffect(() => {
    async function loadVersion() {
      if (!versionId) return
      try {
        setIsLoading(true)
        const data = await fetchStudentVersionDetails(versionId)
        setVersion(data)
        if (data.sections && data.sections.length > 0) {
          const allQuestions = data.sections.flatMap(s => s.questions || [])
          setQuestions(allQuestions)
        } else {
          setQuestions(data.questions || [])
        }
        
        const attempt = await fetchAttemptStatus(versionId)
        if (attempt && attempt.status === 'STARTED') {
          setHasOngoingAttempt(true)
        }
      } catch {
        toast.error('Failed to load test info')
      } finally {
        setIsLoading(false)
      }
    }
    void loadVersion()
  }, [versionId])

  // ─── Start test session ────────────────────────────────────────────────
  const startTestSession = async () => {
    if (!versionId) return
    try {
      setIsLoading(true)
      const attempt = await startTestAttempt(versionId)
      const startTime = new Date(attempt.startTime).getTime()
      const limitMs = (version?.timeLimitMinutes || 60) * 60 * 1000
      const clockSkew = new Date(attempt.serverNow).getTime() - Date.now()
      deadlineRef.current = startTime + limitMs - clockSkew
      setTimeLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)))
      if (attempt.answers) {
        const ans = attempt.answers as Record<string, any>
        setAnswers(ans)
        
        if (ans._timeSpent) {
          timeSpentRef.current = ans._timeSpent
        }
        
        if (ans._submittedSections) {
          const subs = new Set<string>(ans._submittedSections)
          setSubmittedSections(subs)
          
          const firstUnsubmittedIdx = questions.findIndex(q => {
            const s = version?.sections?.find(sec => sec.questions?.some(qu => qu.id === q.id))
            return s && !subs.has(s.id)
          })
          if (firstUnsubmittedIdx !== -1) {
            setCurrentIndex(firstUnsubmittedIdx)
          } else {
            setCurrentIndex(questions.length - 1)
          }
        }
      }
      setPhase('test')
    } catch {
      toast.error('Failed to start test session')
    } finally {
      setIsLoading(false)
    }
  }


  // ─── Real-time save answers ──────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'test' || isSubmitted || !versionId) return
    
    // Skip empty initial saves
    if (Object.keys(answers).length === 0) return

    setIsSaving(true)
    const timer = setTimeout(() => {
      const payload = { ...answers, _timeSpent: timeSpentRef.current, _submittedSections: Array.from(submittedSections) }
      saveTestAnswers(versionId, payload).then(() => {
        setLastSaved(new Date())
      }).catch(console.error).finally(() => {
        setIsSaving(false)
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [answers, versionId, phase, isSubmitted, submittedSections])

  // Periodic save for timer
  React.useEffect(() => {
    if (phase !== 'test' || isSubmitted || !versionId) return
    const t = setInterval(() => {
      const payload = { ...answers, _timeSpent: timeSpentRef.current, _submittedSections: Array.from(submittedSections) }
      saveTestAnswers(versionId, payload).catch(console.error)
    }, 15000)
    return () => clearInterval(t)
  }, [answers, versionId, phase, isSubmitted, submittedSections])

  // ─── Answer handler with word-limit enforcement ─────────────────────────
  const handleAnswer = (questionId: string, answer: string) => {
    if (isSubmitted) return
    const wordLimit = currentRules?.wordLimit
    if (wordLimit && currentQuestion?.type !== 'MCQ') {
      const words = answer.trim() === '' ? [] : answer.trim().split(/\s+/)
      if (words.length > wordLimit) return // block beyond limit
    }
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: answer }
      if (currentQuestion?.type === 'MCQ') {
        setIsSaving(true)
        const payload = { ...newAnswers, _timeSpent: timeSpentRef.current, _submittedSections: Array.from(submittedSections) }
        saveTestAnswers(versionId!, payload).then(() => {
          setLastSaved(new Date())
        }).catch(console.error).finally(() => setIsSaving(false))
      }
      return newAnswers
    })
  }

  // ─── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!versionId || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitted(true)
    // Include proctoring logs in the payload
    const payload = {
      ...answers,
      _timeSpent: timeSpentRef.current,
      _submittedSections: Array.from(submittedSections),
      _proctoringLogs: antiCheat.events
    }
    // Retry transient failures; the backend treats a repeated submit as a no-op.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await submitTestAttempt(versionId, payload)
        toast.success('Test submitted successfully!')
        setTimeout(() => navigate({ to: '/dashboard' }), 2000)
        return
      } catch {
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
      }
    }
    submittingRef.current = false
    setIsSubmitted(false)
    toast.error('Failed to submit test. Your answers are saved — please try submitting again or contact support.', { duration: 10000 })
  }

  // ─── Auto-cancel section on max violations ─────────────────────────────
  React.useEffect(() => {
    if (!currentSection) return
    const maxViolations = currentRules?.maxViolations ?? 5
    const allowTabSwitching = currentRules?.allowTabSwitching ?? false
    if (!allowTabSwitching && maxViolations > 0 && antiCheat.violations >= maxViolations) {
      if (!cancelledSections.has(currentSection.id)) {
        setCancelledSections(prev => new Set(prev).add(currentSection.id))
        toast.error(`Section "${currentSection.title}" cancelled due to violations. Moving to next section.`, { duration: 5000 })
        // Move to first question of next section
        const nextSectionIdx = (version?.sections?.findIndex(s => s.id === currentSection.id) ?? -1) + 1
        const nextSection = version?.sections?.[nextSectionIdx]
        const firstQuestionId = nextSection?.questions?.[0]?.id
        if (firstQuestionId) {
          const nextQIdx = questions.findIndex(q => q.id === firstQuestionId)
          if (nextQIdx !== -1) handleNavigate(nextQIdx)
        }
        antiCheat.resetViolations()
      }
    }
  }, [antiCheat.violations, currentSection, currentRules, cancelledSections, version, questions, antiCheat])

  // ─── Per-question timer ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'test' || isSubmitted) return
    const secLimit = currentRules?.timeLimitSeconds ?? currentQuestion?.timeLimitSeconds
    if (!secLimit) {
      setQuestionTimeLeft(null)
      return
    }
    const spent = currentQuestion?.id ? (timeSpentRef.current[currentQuestion.id] || 0) : 0
    setQuestionTimeLeft(Math.max(0, secLimit - spent))
  }, [currentIndex, currentRules?.timeLimitSeconds, currentQuestion?.timeLimitSeconds, phase, isSubmitted])

  React.useEffect(() => {
    if (questionTimeLeft === null || phase !== 'test' || isSubmitted) return
    if (questionTimeLeft <= 0) {
      if (currentIndex < questions.length - 1) {
        toast.warning('Time up for this question! Moving to next.')
        handleNavigate(currentIndex + 1)
      } else if (!autoSubmitFiredRef.current) {
        autoSubmitFiredRef.current = true
        void handleSubmit()
      }
      return
    }
    const t = setInterval(() => {
      setQuestionTimeLeft(prev => prev !== null ? prev - 1 : null)
      if (currentQuestion) {
        timeSpentRef.current[currentQuestion.id] = (timeSpentRef.current[currentQuestion.id] || 0) + 1
      }
    }, 1000)
    return () => clearInterval(t)
  }, [questionTimeLeft, phase, isSubmitted, currentIndex, currentQuestion])

  // ─── Overall timer ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (timeLeft === null || isSubmitted || phase !== 'test') return
    if (timeLeft <= 0) {
      // Auto-submit once; a failure must not re-trigger it in a loop.
      if (!autoSubmitFiredRef.current) {
        autoSubmitFiredRef.current = true
        void handleSubmit()
      }
      return
    }
    const timer = setInterval(() => {
      if (deadlineRef.current === null) return
      setTimeLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, isSubmitted, phase])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  // ─── Phase: Not in secure window ───────────────────────────────────────
  if (!antiCheat?.isSecureWindow) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans px-6">
        <div className="w-full max-w-md p-10 border border-destructive/50 bg-card rounded-md shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-destructive"></div>
          
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-xl font-heading font-bold text-foreground mb-3 uppercase tracking-tight">Secure Window Required</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Please launch the test in a secure window to continue with the assessment.
          </p>
          <button
            onClick={() => {
              window.open(window.location.href, 'lex-test-window', 'width=1200,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes')
              void navigate({ to: '/dashboard' })
            }}
            className="w-full h-12 flex items-center justify-center text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-sm"
          >
            Launch Secure Window
          </button>
        </div>
      </div>
    )
  }

  // ─── Phase: Loading ────────────────────────────────────────────────────
  if (isLoading && !version) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h1 className="tracking-widest font-bold uppercase text-muted-foreground text-sm">Loading Test...</h1>
        </div>
      </div>
    )
  }

  // ─── Phase: Instructions ───────────────────────────────────────────────
  if (phase === 'instructions') {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans px-6 py-16 md:px-12">
        <div className="mx-auto w-full max-w-5xl">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6">
               <span className="h-px w-8 bg-primary" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                 LexAssess
               </span>
               <span className="h-px w-8 bg-primary" />
            </div>
            <h1 className="mb-4 font-heading text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight tracking-tight text-foreground">
              {version?.paper?.title ?? 'Assessment'}
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              {version?.versionName} <span className="mx-2 text-primary/50">•</span> {version?.timeLimitMinutes} minutes
            </p>
          </div>

          {/* Section Overview Cards */}
          {version?.sections && version.sections.length > 0 && (
            <div className={`mb-16 grid gap-6 sm:grid-cols-1 ${version.sections.length === 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
              {version.sections.map((section, idx) => {
                const rules = section.rules as SectionRules | undefined
                const qCount = section.questions?.length ?? 0
                // For marks: if questions have subquestions, sum the subquestion marks. Otherwise use parent marks.
                const totalMarks = section.questions?.reduce((a, q) => {
                  if (q.subQuestions && q.subQuestions.length > 0) {
                    return a + q.subQuestions.reduce((sa: number, sq: any) => sa + (sq.marks ?? 0), 0)
                  }
                  return a + (q.marks ?? 0)
                }, 0) ?? 0
                return (
                  <div key={section.id} className="relative flex flex-col p-8 border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow rounded-md overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-12 bg-primary"></div>
                    <div className="mb-4 text-primary text-4xl font-bold font-serif opacity-30">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground">{section.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground mb-6 flex-grow">
                      {qCount} question{qCount !== 1 ? 's' : ''} • {totalMarks} marks
                      {rules?.timeLimitSeconds ? ` • ${rules.timeLimitSeconds}s/q` : ''}
                      {rules?.questionsToAttempt ? ` • Attempt any ${rules.questionsToAttempt}` : ''}
                    </p>
                    
                    <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-border/50">
                      <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 ${rules?.allowExternalResources ? 'text-primary' : 'text-destructive'}`}>
                        {rules?.allowExternalResources ? '✓ Open-book' : '✗ Closed-book'}
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 ${rules?.allowTabSwitching ? 'text-primary' : 'text-amber-600'}`}>
                        {rules?.allowTabSwitching ? '✓ Tab switching permitted' : `⚠ No tab switching`}
                      </span>
                      {(rules?.wordLimit ?? 0) > 0 && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                          ✎ Max {rules?.wordLimit} words / answer
                        </span>
                      )}
                      {rules?.allowedResources && rules.allowedResources.filter(Boolean).length > 0 && (
                        <span className="text-[10px] text-primary italic mt-1">
                          Allowed: {rules.allowedResources.filter(Boolean).join(', ')}
                        </span>
                      )}
                      {rules?.blockedResources && rules.blockedResources.filter(Boolean).length > 0 && (
                        <span className="text-[10px] text-destructive italic">
                          Blocked: {rules.blockedResources.filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Instructions content */}
          <div className="mb-16 relative p-8 md:p-12 border border-border/50 bg-card rounded-md shadow-sm">
            <div className="absolute -top-3 left-8 bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/30">
              General Instructions
            </div>
            {version?.instructions ? (
              <div
                className="max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(version.instructions) }}
              />
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p className="text-lg">No specific instructions provided for this paper.</p>
                <p className="text-sm mt-2">Please follow standard examination guidelines.</p>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div className="text-center py-12 border-t border-border/40">
            <p className="mb-8 text-sm text-muted-foreground max-w-lg mx-auto">
              By clicking <strong className="text-foreground font-bold">Proceed to Security Setup</strong>, you confirm you have read and understood all instructions above.
            </p>
            <button
              onClick={() => setPhase('security')}
              className="inline-flex h-14 items-center justify-center px-8 text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-sm shadow-sm"
            >
              Proceed to Security Setup
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Phase: Security Setup ─────────────────────────────────────────────
  if (phase === 'security') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans px-6 py-12">
        <div className="w-full max-w-lg p-10 border border-border/50 bg-card rounded-md shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
               <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                 Security Setup
               </span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">System Check</h2>
            <p className="text-muted-foreground text-sm">Test: <strong className="text-foreground">{version?.versionName}</strong></p>
          </div>

          <div className="flex flex-col gap-4">
            <div className={`p-4 border ${antiCheat?.isScreenShared ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-muted/30'} rounded-sm flex justify-between items-center transition-colors`}>
              <span className="font-semibold text-sm text-foreground">1. Entire Screen Sharing</span>
              {antiCheat?.isScreenShared ? (
                <span className="text-primary font-bold text-xs uppercase tracking-wider">Active ✓</span>
              ) : (
                <button onClick={antiCheat?.requestScreenShare} className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors">Grant</button>
              )}
            </div>

            <div className={`p-4 border ${antiCheat?.isCamMicAllowed ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-muted/30'} rounded-sm flex justify-between items-center transition-colors ${antiCheat?.isScreenShared ? '' : 'opacity-50'}`}>
              <span className="font-semibold text-sm text-foreground">2. Camera & Microphone</span>
              {antiCheat?.isCamMicAllowed ? (
                <span className="text-primary font-bold text-xs uppercase tracking-wider">Active ✓</span>
              ) : (
                <button onClick={antiCheat?.requestCamMic} disabled={!antiCheat?.isScreenShared} className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors disabled:cursor-not-allowed">Grant</button>
              )}
            </div>

            <button
              onClick={startTestSession}
              disabled={!antiCheat?.isScreenShared || !antiCheat?.isCamMicAllowed || isLoading}
              className={`mt-6 h-12 w-full flex items-center justify-center text-sm font-bold uppercase tracking-widest rounded-sm transition-colors ${(antiCheat?.isScreenShared && antiCheat?.isCamMicAllowed) ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
            >
              {isLoading ? 'Initializing...' : (hasOngoingAttempt ? 'Resume Test' : 'Start Test')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Phase: Test ────────────────────────────────────────────────────────
  if (!currentQuestion) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <h1 className="tracking-widest font-bold uppercase text-muted-foreground text-sm">Loading Test...</h1>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans px-6">
        <div className="text-center p-8 border border-border/50 bg-card rounded-md shadow-sm max-w-md w-full">
          <h2 className="text-xl font-heading font-bold text-foreground mb-4">{questions.length === 0 ? 'No questions available for this test' : 'Question not found'}</h2>
          <button
            onClick={() => questions.length === 0 ? navigate({ to: '/dashboard' }) : setCurrentIndex(0)}
            className="h-12 px-6 flex items-center justify-center text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-sm mx-auto"
          >
            {questions.length === 0 ? 'Back to Dashboard' : 'Return to start'}
          </button>
        </div>
      </div>
    )
  }

  const isSectionCancelled = currentSection ? cancelledSections.has(currentSection.id) : false
  const currentAnswer = answers[currentQuestion.id] || ''
  const wordCount = countWords(currentAnswer)
  const wordLimit = currentRules?.wordLimit
  const maxViolationsForSection = currentRules?.maxViolations ?? 5
  const violationsForSection = antiCheat.violations

  const isQuestionAttempted = (q: Question) => {
    if (q.subQuestions && q.subQuestions.length > 0) {
      return q.subQuestions.some(sub => !!answers[sub.id])
    }
    return !!answers[q.id]
  }

  return (
    <div className="flex min-h-screen bg-background font-sans select-none">
      {/* Screen Share Interrupted Overlay */}
      {!antiCheat.isScreenShared && phase === 'test' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
          <div className="bg-background p-10 rounded-xl max-w-lg text-center shadow-2xl">
            <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Screen Sharing Stopped</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              You have stopped sharing your screen. The test has been paused. You must resume screen sharing to continue.
            </p>
            <button
              onClick={antiCheat.requestScreenShare}
              className="w-full py-4 bg-primary text-primary-foreground rounded-md font-bold text-lg hover:bg-primary/90 transition-colors"
            >
              Resume Screen Sharing
            </button>
          </div>
        </div>
      )}

      {/* Violation Warning (tab switch / focus lost) */}
      {phase === 'test' && !currentRules?.allowTabSwitching && (
        <ViolationWarning violation={antiCheat.lastViolation} onDismiss={antiCheat.dismissViolation} />
      )}

      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-border">
          <h1 className="text-lg font-bold text-foreground mb-1 line-clamp-2" title={version?.versionName}>
            {version?.versionName}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Question {currentIndex + 1} of {questions.length}
          </p>
          
          {/* Timers */}
          <div className="mt-4 flex flex-col gap-3">
            <div className={`px-4 py-3 rounded-md font-bold text-center border shadow-sm ${timeLeft && timeLeft < 300 ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-muted/50 text-foreground border-border'}`}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Time Remaining</div>
              <div className="text-2xl font-mono">{timeLeft !== null ? formatTime(timeLeft) : '--:--'}</div>
            </div>
            {questionTimeLeft !== null && (
              <div className={`px-4 py-2 rounded-md font-bold text-sm text-center border ${questionTimeLeft < 15 ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                Question Time: ⏱ {formatTime(questionTimeLeft)}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* Progress Bar */}
          <div className="h-2 w-full bg-muted rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }} />
          </div>

          {/* Section Navigation */}
          {version?.sections && version.sections.length > 1 && (
            <div className="mb-8 flex flex-col gap-2">
              <p className="text-xs font-bold text-muted-foreground tracking-wider mb-2">SECTIONS</p>
              {version.sections.map((section, sIdx) => {
                const sQuestions = section.questions || []
                const sFirstIdx = questions.findIndex(q => q.id === sQuestions[0]?.id)
                const isActive = sQuestions.some(q => q.id === currentQuestion?.id)
                const isCancelled = cancelledSections.has(section.id)
                const isLocked = submittedSections.has(section.id);
                return (
                  <button
                    key={section.id}
                    onClick={() => sFirstIdx !== -1 && handleNavigate(sFirstIdx)}
                    disabled={isLocked}
                    className={`text-left px-4 py-2.5 rounded-md border text-sm font-medium transition-colors shadow-sm ${
                      isLocked ? 'opacity-50 cursor-not-allowed ' : ''
                    }${
                      isActive 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : isCancelled 
                          ? 'border-destructive bg-destructive/10 text-destructive' 
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Section {String.fromCharCode(65 + sIdx)}
                    {isCancelled && ' ✗'}
                  </button>
                )
              })}
            </div>
          )}

          {/* Question Grid */}
          <div>
            {version?.sections && version.sections.length > 1 ? (
              version.sections.map((section, sIdx) => (
                <div key={section.id} className="mb-6 last:mb-0">
                  <p className="text-[10px] font-bold text-muted-foreground tracking-wider mb-3">
                    SECTION {String.fromCharCode(65 + sIdx)} {cancelledSections.has(section.id) && <span className="text-destructive">— CANCELLED</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(section.questions || []).map((q) => {
                      const qIdx = questions.findIndex(qq => qq.id === q.id)
                      if (qIdx === -1) return null
                      
                      if (q.subQuestions && q.subQuestions.length > 0) {
                        return (
                          <div key={q.id} className="flex flex-col gap-1 w-full mt-2 mb-2">
                            <p className="text-[10px] font-semibold text-muted-foreground">Q{qIdx + 1} (Passage)</p>
                            <div className="flex flex-wrap gap-2">
                              {q.subQuestions.map((subQ, subIdx) => {
                                const isSubAttempted = !!answers[subQ.id]
                                const isLocked = submittedSections.has(section.id);
                                return (
                                  <button
                                    key={subQ.id}
                                    onClick={() => {
                                      handleNavigate(qIdx, subIdx);
                                      setTimeout(() => {
                                        document.getElementById(`subq-${subQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                      }, 100);
                                    }}
                                    disabled={isLocked}
                                    className={`w-10 h-10 rounded-md border text-sm font-bold flex items-center justify-center transition-colors shadow-sm ${
                                      isLocked ? 'opacity-50 cursor-not-allowed ' : ''
                                    }${
                                      currentIndex === qIdx && currentSubIndex === subIdx
                                        ? 'border-primary bg-primary text-primary-foreground' 
                                        : isSubAttempted 
                                          ? 'border-green-500 bg-green-50 text-green-700' 
                                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                    }`}
                                  >
                                    {qIdx + 1}{String.fromCharCode(97 + subIdx)}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }
                      
                      const isLocked = submittedSections.has(section.id);
                      return (
                        <button
                          key={q.id}
                          onClick={() => handleNavigate(qIdx)}
                          disabled={isLocked}
                          className={`w-10 h-10 rounded-md border text-sm font-bold flex items-center justify-center transition-colors shadow-sm ${
                            isLocked ? 'opacity-50 cursor-not-allowed ' : ''
                          }${
                            currentIndex === qIdx 
                              ? 'border-primary bg-primary text-primary-foreground' 
                              : isQuestionAttempted(q) 
                                ? 'border-green-500 bg-green-50 text-green-700' 
                                : 'border-border bg-card text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {qIdx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div>
                <p className="text-xs font-bold text-muted-foreground tracking-wider mb-3">QUESTIONS</p>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q, idx) => {
                    if (q.subQuestions && q.subQuestions.length > 0) {
                      return (
                        <div key={q.id} className="flex flex-col gap-1 w-full mt-2 mb-2">
                          <p className="text-[10px] font-semibold text-muted-foreground">Q{idx + 1} (Passage)</p>
                          <div className="flex flex-wrap gap-2">
                            {q.subQuestions.map((subQ, subIdx) => {
                              const isSubAttempted = !!answers[subQ.id]
                              const qSection = version?.sections?.find(s => s.questions?.some(qu => qu.id === q.id));
                              const isLocked = qSection ? submittedSections.has(qSection.id) : false;
                              return (
                                <button
                                  key={subQ.id}
                                  onClick={() => {
                                    handleNavigate(idx, subIdx);
                                    setTimeout(() => {
                                      document.getElementById(`subq-${subQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                    }, 100);
                                  }}
                                  disabled={isLocked}
                                  className={`w-10 h-10 rounded-md border text-sm font-bold flex items-center justify-center transition-colors shadow-sm ${
                                    isLocked ? 'opacity-50 cursor-not-allowed ' : ''
                                  }${
                                    currentIndex === idx 
                                      ? 'border-primary bg-primary text-primary-foreground' 
                                      : isSubAttempted 
                                        ? 'border-green-500 bg-green-50 text-green-700' 
                                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                    {idx + 1}{String.fromCharCode(97 + subIdx)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }

                    const qSection = version?.sections?.find(s => s.questions?.some(qu => qu.id === q.id));
                    const isLocked = qSection ? submittedSections.has(qSection.id) : false;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleNavigate(idx)}
                        disabled={isLocked}
                        className={`w-10 h-10 rounded-md border text-sm font-bold flex items-center justify-center transition-colors shadow-sm ${
                          isLocked ? 'opacity-50 cursor-not-allowed ' : ''
                        }${
                          currentIndex === idx 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : isQuestionAttempted(q) 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-80 flex flex-col min-h-screen relative bg-muted/20">
        <AntiCheatMonitor
          userStream={antiCheat.userStream}
          micLevel={antiCheat.micLevel}
          isScreenShared={antiCheat.isScreenShared}
          violations={currentRules?.allowTabSwitching ? 0 : antiCheat.violations}
          allowedResources={currentRules?.allowedResources}
          blockedResources={currentRules?.blockedResources}
        />

        <div className="flex-1 p-8 md:p-12 max-w-4xl mx-auto w-full flex flex-col">
          {/* Section Header */}
          {currentSection && (
            <div className="mb-8">
              <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
                {currentSection.title}
              </h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <SectionBadge rules={currentRules} />
                  {!currentRules?.allowTabSwitching && (
                    <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${violationsForSection > 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {violationsForSection}/{maxViolationsForSection} violations
                    </span>
                  )}
                  {isSectionCancelled && (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-destructive text-destructive-foreground">
                      ✗ SECTION CANCELLED
                    </span>
                  )}
                </div>
                {(currentRules?.allowedResources?.filter(Boolean).length ?? 0) > 0 && (
                  <div className="text-xs text-green-700 flex gap-2 items-center bg-green-50 px-3 py-1.5 rounded-md border border-green-200 w-fit">
                    <span className="font-bold">ALLOWED:</span>
                    <span className="opacity-90">{currentRules?.allowedResources?.filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {(currentRules?.blockedResources?.filter(Boolean).length ?? 0) > 0 && (
                  <div className="text-xs text-destructive flex gap-2 items-center bg-destructive/10 px-3 py-1.5 rounded-md border border-destructive/20 w-fit">
                    <span className="font-bold">BLOCKED:</span>
                    <span className="opacity-90">{currentRules?.blockedResources?.filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Content */}
          <div className="bg-card border border-border shadow-sm rounded-xl p-8 mb-8 flex-1">
            <div className="flex justify-between items-center mb-2 pb-2">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {isSaving ? (
                  <><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /> Saving...</>
                ) : lastSaved ? (
                  <><div className="w-2 h-2 bg-green-500 rounded-full" /> Saved</>
                ) : null}
              </div>
            </div>
            <div className="flex justify-between items-start mb-8 gap-6 pb-6 border-b border-border/50">
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground flex-1" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentQuestion.text) }} />
              <span className="bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded-md font-bold text-sm whitespace-nowrap shrink-0">
                {currentQuestion.marks} {currentQuestion.marks === 1 ? 'Mark' : 'Marks'}
              </span>
            </div>

            <div>
              {currentQuestion.subQuestions && currentQuestion.subQuestions.length > 0 ? (
                <div className="flex flex-col gap-8">
                  {(() => {
                    const subQ = currentQuestion.subQuestions![currentSubIndex]
                    if (!subQ) return null
                    const subAnswer = answers[subQ.id] || ''
                    const subWordCount = countWords(subAnswer)
                    return (
                      <div key={subQ.id} id={`subq-${subQ.id}`} className="p-8 bg-card rounded-xl border border-border shadow-sm">
                        <div className="flex justify-between items-start gap-6 mb-6">
                          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground flex-1" dangerouslySetInnerHTML={{ __html: renderMarkdown(subQ.text) }} />
                          <span className="bg-green-100 text-green-800 border border-green-200 px-2 py-1 rounded-md font-bold text-xs shrink-0">
                            {subQ.marks} {subQ.marks === 1 ? 'Mark' : 'Marks'}
                          </span>
                        </div>
                        
                        {subQ.type === 'MCQ' ? (
                          <div className="flex flex-col gap-3">
                            {Array.isArray(subQ.options) && subQ.options.map((opt: any) => {
                              const isSelected = answers[subQ.id] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleAnswer(subQ.id, opt.id)}
                                  disabled={isSectionCancelled}
                                  className={`text-left px-5 py-4 rounded-lg border-2 flex items-center gap-4 transition-all ${
                                    isSelected 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border bg-card hover:border-primary/50'
                                  } ${isSectionCancelled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground bg-transparent'
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 bg-background rounded-full" />}
                                  </div>
                                  <span className="text-sm font-medium text-foreground">
                                    <strong>{opt.id}.</strong> {opt.text}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                            <textarea
                              className={`w-full min-h-[160px] p-4 rounded-lg border-2 text-sm text-foreground bg-background leading-relaxed outline-none resize-y transition-colors focus:border-primary shadow-sm ${
                                wordLimit && subWordCount >= wordLimit ? 'border-destructive focus:border-destructive' : 'border-border'
                              } ${isSectionCancelled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              placeholder={isSectionCancelled ? 'This section has been cancelled.' : 'Type your answer here...'}
                              value={subAnswer}
                              disabled={isSectionCancelled}
                              onChange={(e) => {
                                const v = e.target.value
                                if (wordLimit) {
                                  const w = v.trim() === '' ? [] : v.trim().split(/\s+/)
                                  if (w.length > wordLimit) return
                                }
                                setAnswers(prev => ({ ...prev, [subQ.id]: v }))
                              }}
                            />
                            <div className="flex justify-end mt-2">
                              {wordLimit ? (
                                <span className={`text-xs font-semibold ${subWordCount >= wordLimit ? 'text-destructive' : subWordCount >= wordLimit * 0.85 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                  {subWordCount} / {wordLimit} words
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">{subWordCount} words</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : currentQuestion.type === 'MCQ' ? (
                <div className="flex flex-col gap-4">
                  {Array.isArray(currentQuestion.options) && currentQuestion.options.map((opt: any) => {
                    const isSelected = answers[currentQuestion.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswer(currentQuestion.id, opt.id)}
                        disabled={isSectionCancelled}
                        className={`text-left px-6 py-5 rounded-xl border-2 flex items-center gap-5 transition-all shadow-sm ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border bg-card hover:border-primary/50'
                        } ${isSectionCancelled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground bg-transparent'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-background rounded-full" />}
                        </div>
                        <span className="text-base font-medium text-foreground">
                          <strong>{opt.id}.</strong> {opt.text}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div>
                  <textarea
                    className={`w-full min-h-[240px] p-5 rounded-xl border-2 text-base text-foreground bg-background leading-relaxed outline-none resize-y transition-colors focus:border-primary shadow-sm ${
                      wordLimit && wordCount >= wordLimit ? 'border-destructive focus:border-destructive' : 'border-border'
                    } ${isSectionCancelled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder={isSectionCancelled ? 'This section has been cancelled.' : 'Type your answer here...'}
                    value={currentAnswer}
                    disabled={isSectionCancelled}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-muted-foreground font-medium">
                      {currentRules?.allowExternalResources ? '🔍 Research permitted for this section' : '🔒 Closed-book — no external resources'}
                    </span>
                    {wordLimit ? (
                      <span className={`text-sm font-semibold ${wordCount >= wordLimit ? 'text-destructive' : wordCount >= wordLimit * 0.85 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {wordCount} / {wordLimit} words
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{wordCount} words</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-6 border-t border-border mt-auto">
            <button
              onClick={() => {
                if (currentSubIndex > 0) {
                  handleNavigate(currentIndex, currentSubIndex - 1)
                } else {
                  const prevQ = questions[currentIndex - 1]
                  const prevSubIdx = prevQ && prevQ.subQuestions && prevQ.subQuestions.length > 0 ? prevQ.subQuestions.length - 1 : 0
                  handleNavigate(currentIndex - 1, prevSubIdx)
                }
              }}
              disabled={currentIndex === 0 && currentSubIndex === 0 || (() => {
                 const prevQ = currentSubIndex > 0 ? currentQuestion : questions[currentIndex - 1];
                 if (!prevQ) return true;
                 const prevS = version?.sections?.find(s => s.questions?.some(qu => qu.id === prevQ.id));
                 return prevS ? submittedSections.has(prevS.id) : false;
              })()}
              className="px-6 py-3 rounded-md border border-border bg-card font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              ← Previous
            </button>

            {!(currentIndex === questions.length - 1 && (!currentQuestion.subQuestions || currentSubIndex === currentQuestion.subQuestions.length - 1)) ? (
              <button
                onClick={() => {
                  if (currentQuestion.subQuestions && currentSubIndex < currentQuestion.subQuestions.length - 1) {
                    handleNavigate(currentIndex, currentSubIndex + 1)
                  } else {
                    handleNavigate(currentIndex + 1, 0)
                  }
                }}
                className="px-10 py-3 rounded-md bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitted}
                className="px-12 py-3 rounded-md bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitted && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitted ? 'SUBMITTING...' : 'FINISH & SUBMIT'}
              </button>
            )}
          </div>
        </div>
      </div>
      <AlertDialog open={pendingNavigation !== null} onOpenChange={(open) => { if (!open) setPendingNavigation(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Section?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to navigate to a different section. By proceeding, the current section will be submitted and you won't be able to return to it to change your answers. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Submit & Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
