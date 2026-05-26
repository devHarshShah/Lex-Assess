import React from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { fetchVersionDetails, type QuestionPaperVersion, type Question, startTestAttempt, submitTestAttempt, fetchAttemptStatus } from '@/lib/question-papers'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'

export function TestAttemptPage() {
  const { versionId } = useParams({ from: '/dashboard/test-attempt/$versionId' })
  const navigate = useNavigate()
  
  const [version, setVersion] = React.useState<QuestionPaperVersion | null>(null)
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null) // in seconds
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  // Load test data and start/resume attempt
  React.useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        
        // 1. Fetch version details
        const data = await fetchVersionDetails(versionId)
        setVersion(data)
        setQuestions(data.questions || [])

        // 2. Start or Resume attempt on server
        const attempt = await startTestAttempt(versionId)
        
        if (attempt.status === 'SUBMITTED' || attempt.status === 'EXPIRED') {
          toast.info('You have already completed this test')
          void navigate({ to: '/dashboard' })
          return
        }

        // 3. Calculate remaining time based on server start time
        const startTime = new Date(attempt.startTime).getTime()
        const now = new Date().getTime()
        const limitSeconds = (data.timeLimitMinutes || 60) * 60
        const elapsedSeconds = Math.floor((now - startTime) / 1000)
        const remaining = Math.max(0, limitSeconds - elapsedSeconds)
        
        setTimeLeft(remaining)
        
        // 4. Restore answers if resuming
        if (attempt.answers) {
          setAnswers(attempt.answers as Record<string, string>)
        }

      } catch (error: any) {
        toast.error(error.message || 'Failed to initialize test')
        void navigate({ to: '/dashboard' })
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [versionId, navigate])

  // Timer logic
  React.useEffect(() => {
    if (timeLeft === null || isSubmitted) return

    if (timeLeft <= 0) {
      void handleSubmit(true)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isSubmitted])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswer = (questionId: string, answer: string) => {
    if (isSubmitted) return
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async (auto = false) => {
    if (isSubmitted) return
    
    try {
      setIsSubmitted(true)
      
      // Submit to server
      await submitTestAttempt(versionId, answers)
      
      if (auto) {
        toast.warning('Time is up! Your test has been auto-submitted.')
      } else {
        toast.success('Test submitted successfully!')
      }
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        void navigate({ to: '/dashboard' })
      }, 2000)
    } catch (error: any) {
      setIsSubmitted(false)
      toast.error(error.message || 'Failed to submit test')
    }
  }

  if (isLoading || !version || timeLeft === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse">Preparing your test session...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header with Timer */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold line-clamp-1">{version.versionName}</h1>
          <p className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm ${timeLeft < 300 ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' : 'bg-muted/50'}`}>
          <Clock size={18} />
          <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question Canvas */}
      <Card className="shadow-lg border-2">
        <CardHeader className="bg-muted/30 pb-6">
          <div className="flex justify-between items-start gap-4">
            <CardTitle className="text-xl leading-relaxed">
              {currentQuestion?.text}
            </CardTitle>
            <div className="shrink-0 bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-bold">
              {currentQuestion?.marks} Marks
            </div>
          </div>
          {currentQuestion?.timeLimitSeconds && (
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 font-medium bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-100">
              <AlertTriangle size={14} />
              Suggested time: {currentQuestion.timeLimitSeconds}s
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-8 min-h-[300px]">
          {currentQuestion?.type === 'MCQ' ? (
            <div className="grid gap-4">
              {Array.isArray(currentQuestion.options) && currentQuestion.options.map((opt: any) => (
                <button
                  key={opt.id}
                  onClick={() => handleAnswer(currentQuestion.id, opt.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:bg-muted/50 ${
                    answers[currentQuestion.id] === opt.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${
                    answers[currentQuestion.id] === opt.id ? 'bg-primary text-white border-primary' : 'bg-muted border-border'
                  }`}>
                    {opt.id}
                  </div>
                  <span className="font-medium">{opt.text}</span>
                </button>
              ))}
            </div>
          ) : currentQuestion ? (
            <div className="space-y-4">
              <textarea
                className="w-full min-h-[200px] p-4 rounded-xl border-2 bg-muted/10 focus:bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                placeholder="Type your answer here..."
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-right italic">
                {answers[currentQuestion.id]?.length || 0} characters
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No question content available.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between p-6 bg-muted/10 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ChevronLeft size={18} /> Previous
          </Button>
          
          {currentIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="gap-2 px-8"
            >
              Next <ChevronRight size={18} />
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={() => handleSubmit()}
              className="gap-2 px-8 bg-green-600 hover:bg-green-700"
            >
              Submit Test <Send size={18} />
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-10 rounded-md font-medium text-sm transition-all border ${
              currentIndex === idx 
                ? 'bg-primary text-white border-primary shadow-md' 
                : answers[q.id] 
                  ? 'bg-green-100 border-green-200 text-green-700' 
                  : 'bg-muted/50 border-border hover:bg-muted'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
