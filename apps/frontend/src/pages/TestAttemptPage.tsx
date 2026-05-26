import React from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { fetchStudentVersionDetails, type QuestionPaperVersion, type Question, startTestAttempt, submitTestAttempt } from '@/lib/question-papers'
import { toast } from 'sonner'
import { useAntiCheat } from '@/hooks/use-anti-cheat'
import { AntiCheatMonitor } from '@/components/anti-cheat-monitor'

export function TestAttemptPage() {
  const params = useParams({ strict: false }) as { versionId?: string }
  const versionId = params?.versionId
  const navigate = useNavigate()
  const antiCheat = useAntiCheat()
  
  const [version, setVersion] = React.useState<QuestionPaperVersion | null>(null)
  const [questions, setQuestions] = React.useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSetupComplete, setIsSetupComplete] = React.useState(false)

  React.useEffect(() => {
    async function loadVersion() {
      if (!versionId) return
      try {
        setIsLoading(true)
        const data = await fetchStudentVersionDetails(versionId)
        setVersion(data)
        setQuestions(data.questions || [])
      } catch (error: any) {
        toast.error('Failed to load test info')
      } finally {
        setIsLoading(false)
      }
    }
    void loadVersion()
  }, [versionId])

  const startTestSession = async () => {
    if (!versionId) return
    try {
      setIsLoading(true)
      const attempt = await startTestAttempt(versionId)
      const startTime = new Date(attempt.startTime).getTime()
      const limitSeconds = (version?.timeLimitMinutes || 60) * 60
      const remaining = Math.max(0, limitSeconds - Math.floor((Date.now() - startTime) / 1000))
      setTimeLeft(remaining)
      if (attempt.answers) setAnswers(attempt.answers as Record<string, string>)
      setIsSetupComplete(true)
    } catch (error: any) {
      toast.error('Failed to start test session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswer = (questionId: string, answer: string) => {
    if (isSubmitted) return
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (!versionId || isSubmitted) return
    try {
      setIsSubmitted(true)
      await submitTestAttempt(versionId, answers)
      toast.success('Test submitted successfully!')
      setTimeout(() => navigate({ to: '/dashboard' }), 2000)
    } catch (error: any) {
      setIsSubmitted(false)
      toast.error('Failed to submit test')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Timer logic
  React.useEffect(() => {
    if (timeLeft === null || isSubmitted || !isSetupComplete) return
    if (timeLeft <= 0) {
      void handleSubmit()
      return
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, isSubmitted, isSetupComplete])

  // 1. Not in secure window
  if (!antiCheat?.isSecureWindow) {
    return (
      <div style={{ backgroundColor: '#ef4444', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', color: 'black', padding: '40px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>SECURE WINDOW REQUIRED</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>Please launch the test in a secure window to continue.</p>
            <button 
                onClick={() => {
                    window.open(window.location.href, 'lex-test-window', 'width=1200,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes')
                    void navigate({ to: '/dashboard' })
                }}
                style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
            >
                Launch Secure Window
            </button>
        </div>
      </div>
    )
  }

  // 2. Loading state
  if (isLoading && !version) {
    return (
      <div style={{ backgroundColor: '#3b82f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
        <h1 style={{ letterSpacing: '2px' }}>LOADING TEST...</h1>
      </div>
    )
  }

  // 3. Security Setup Phase
  if (!isSetupComplete) {
    return (
      <div style={{ backgroundColor: '#f59e0b', minHeight: '100vh', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', width: '450px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#111' }}>SECURITY SETUP</h2>
          <p style={{ color: '#666', marginBottom: '25px' }}>Test: <b>{version?.versionName}</b></p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: antiCheat?.isScreenShared ? '#f0fdf4' : '#f9fafb', border: '2px solid', borderColor: antiCheat?.isScreenShared ? '#22c55e' : '#e5e7eb', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500' }}>1. Entire Screen Sharing</span>
                {antiCheat?.isScreenShared ? (
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>ACTIVE ✓</span>
                ) : (
                    <button onClick={antiCheat?.requestScreenShare} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Grant</button>
                )}
            </div>

            <div style={{ padding: '15px', backgroundColor: antiCheat?.isCamMicAllowed ? '#f0fdf4' : '#f9fafb', border: '2px solid', borderColor: antiCheat?.isCamMicAllowed ? '#22c55e' : '#e5e7eb', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: antiCheat?.isScreenShared ? 1 : 0.5 }}>
                <span style={{ fontWeight: '500' }}>2. Camera & Microphone</span>
                {antiCheat?.isCamMicAllowed ? (
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>ACTIVE ✓</span>
                ) : (
                    <button onClick={antiCheat?.requestCamMic} disabled={!antiCheat?.isScreenShared} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Grant</button>
                )}
            </div>

            <button 
                onClick={startTestSession} 
                disabled={!antiCheat?.isScreenShared || !antiCheat?.isCamMicAllowed || isLoading}
                style={{ padding: '16px', marginTop: '15px', backgroundColor: (antiCheat?.isScreenShared && antiCheat?.isCamMicAllowed) ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: (antiCheat?.isScreenShared && antiCheat?.isCamMicAllowed) ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '16px' }}
            >
              {isLoading ? 'INITIALIZING...' : 'START TEST'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 4. Actual Test UI
  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  if (!currentQuestion) {
     if (isLoading) {
        return (
          <div style={{ backgroundColor: '#3b82f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
            <h1 style={{ letterSpacing: '2px' }}>LOADING TEST...</h1>
          </div>
        )
     }
     return (
       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
         <div style={{ textAlign: 'center' }}>
           <h2>{questions.length === 0 ? 'No questions available for this test' : 'Question not found'}</h2>
           <button 
             onClick={() => questions.length === 0 ? navigate({ to: '/dashboard' }) : setCurrentIndex(0)} 
             style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
           >
             {questions.length === 0 ? 'Back to Dashboard' : 'Return to start'}
           </button>
         </div>
       </div>
     )
  }
  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px', fontFamily: 'sans-serif' }} className="select-none">
      {/* Screen Share Interrupted Overlay */}
      {!antiCheat.isScreenShared && isSetupComplete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ backgroundColor: '#fee2e2', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <span style={{ fontSize: '40px' }}>⚠️</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#111' }}>Screen Sharing Stopped</h2>
            <p style={{ color: '#444', lineHeight: '1.6', marginBottom: '32px' }}>
              You have stopped sharing your screen. To prevent cheating, the test has been paused. You must resume screen sharing to continue.
            </p>
            <button 
              onClick={antiCheat.requestScreenShare}
              style={{ width: '100%', padding: '16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}
            >
              Resume Screen Sharing
            </button>
          </div>
        </div>
      )}

      <AntiCheatMonitor 
        userStream={antiCheat.userStream} 
        micLevel={antiCheat.micLevel} 
        isScreenShared={antiCheat.isScreenShared}
        violations={antiCheat.violations}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Sticky Header */}
        <div style={{ backgroundColor: 'white', padding: '20px 30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{version?.versionName}</h1>
            <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>Question {currentIndex + 1} of {questions.length}</p>
          </div>
          <div style={{ padding: '8px 20px', backgroundColor: timeLeft && timeLeft < 300 ? '#fee2e2' : '#f1f5f9', color: timeLeft && timeLeft < 300 ? '#ef4444' : '#475569', borderRadius: '30px', fontWeight: 'bold', fontSize: '18px', border: '1px solid #e2e8f0' }}>
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '8px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '10px', marginBottom: '30px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }} />
        </div>

        {/* Question Card */}
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
             <h2 style={{ fontSize: '22px', lineHeight: '1.4', margin: 0, flex: 1 }}>{currentQuestion.text}</h2>
             <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', marginLeft: '20px' }}>
                {currentQuestion.marks} Marks
             </span>
          </div>

          <div style={{ marginTop: '30px' }}>
             {currentQuestion.type === 'MCQ' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {Array.isArray(currentQuestion.options) && currentQuestion.options.map((opt: any) => (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswer(currentQuestion.id, opt.id)}
                        style={{ 
                           textAlign: 'left', 
                           padding: '20px', 
                           borderRadius: '12px', 
                           border: '2px solid', 
                           borderColor: answers[currentQuestion.id] === opt.id ? '#3b82f6' : '#e2e8f0',
                           backgroundColor: answers[currentQuestion.id] === opt.id ? '#eff6ff' : 'white',
                           cursor: 'pointer',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '15px',
                           transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ 
                           width: '24px', 
                           height: '24px', 
                           borderRadius: '50%', 
                           border: '2px solid', 
                           borderColor: answers[currentQuestion.id] === opt.id ? '#3b82f6' : '#94a3b8',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           backgroundColor: answers[currentQuestion.id] === opt.id ? '#3b82f6' : 'transparent'
                        }}>
                           {answers[currentQuestion.id] === opt.id && <div style={{ width: '10px', height: '10px', backgroundColor: 'white', borderRadius: '50%' }} />}
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: '500' }}>{opt.text}</span>
                      </button>
                   ))}
                </div>
             ) : (
                <textarea
                   style={{ 
                      width: '100%', 
                      minHeight: '250px', 
                      padding: '20px', 
                      borderRadius: '12px', 
                      border: '2px solid #e2e8f0', 
                      fontSize: '16px', 
                      fontFamily: 'inherit',
                      lineHeight: '1.6',
                      outline: 'none',
                      resize: 'none'
                   }}
                   placeholder="Type your answer here..."
                   value={answers[currentQuestion.id] || ''}
                   onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                />
             )}
          </div>

          {/* Footer Controls */}
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '30px' }}>
            <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} 
                disabled={currentIndex === 0}
                style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: '500', color: '#475569' }}
            >
                Previous
            </button>
            
            {currentIndex < questions.length - 1 ? (
                <button 
                    onClick={() => setCurrentIndex(prev => prev + 1)} 
                    style={{ padding: '12px 40px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Next Question
                </button>
            ) : (
                <button 
                    onClick={handleSubmit} 
                    style={{ padding: '12px 50px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    FINISH & SUBMIT
                </button>
            )}
          </div>
        </div>

        {/* Question Nav Grid */}
        <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '8px' }}>
           {questions.map((q, idx) => (
              <button
                 key={idx}
                 onClick={() => setCurrentIndex(idx)}
                 style={{
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: currentIndex === idx ? '#3b82f6' : answers[q.id] ? '#10b981' : '#e2e8f0',
                    backgroundColor: currentIndex === idx ? '#3b82f6' : answers[q.id] ? '#ecfdf5' : 'white',
                    color: currentIndex === idx ? 'white' : answers[q.id] ? '#047857' : '#64748b',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                 }}
              >
                 {idx + 1}
              </button>
           ))}
        </div>
      </div>
    </div>
  )
}
