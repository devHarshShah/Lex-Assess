import React from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getActiveRole, hasRole, type AuthUser } from '@/lib/auth'
import { fetchStudentPapers, type QuestionPaper } from '@/lib/question-papers'
import {
  Clock,
  BookOpen,
  ChevronRight,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Trophy,
  Sparkles,
  FileText,
  ArrowRight,
  PlayCircle,
  RotateCcw,
} from 'lucide-react'
import { useRazorpay } from 'react-razorpay'
import { createSubscription, verifyPayment } from '@/lib/payments'
import { toast } from 'sonner'
import { CompanyDashboardPage } from './CompanyDashboardPage'
import { InterviewerDashboardPage } from './InterviewerDashboardPage'
import { InterviewScheduleCard } from '../components/InterviewScheduleCard'

export function DashboardPage() {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  }) as unknown as AuthUser

  if (!user) return null

  const role = getActiveRole(user)

  if (role === 'COMPANY') {
    return <CompanyDashboardPage />
  }

  if (role === 'INTERVIEWER') {
    return <InterviewerDashboardPage />
  }

  return <StudentDashboardPage user={user} />
}

function StudentDashboardPage({ user }: { user: AuthUser }) {
  const [papers, setPapers] = React.useState<QuestionPaper[]>([])
  const [loading, setLoading] = React.useState(false)
  const [subscribing, setSubscribing] = React.useState(false)
  const { Razorpay } = useRazorpay()

  const role = getActiveRole(user)
  const isStudent = role === 'USER'

  React.useEffect(() => {
    if (isStudent) {
      setLoading(true)
      fetchStudentPapers()
        .then(setPapers)
        .finally(() => setLoading(false))
    }
  }, [isStudent])

  const handleSubscribe = async () => {
    try {
      setSubscribing(true)
      const res = await createSubscription()

      const options = {
        key: res.keyId,
        subscription_id: res.subscriptionId,
        name: 'Lex-Assess',
        description: 'Lex-Assess Subscription',
        handler: async function (response: {
          razorpay_payment_id: string
          razorpay_subscription_id: string
          razorpay_signature: string
        }) {
          let pending = false
          try {
            // Verify payment on backend. A confirmed result activates the
            // subscription immediately; a "pending" result means the payment
            // captured but Razorpay's subscription record hasn't caught up
            // yet (e.g. mandate still confirming) — the webhook is what
            // actually flips access in that case, so don't claim it's
            // unlocked yet. Only a thrown error means verification actually
            // failed — the receipt/success page must only be shown once this
            // resolves, otherwise a genuinely failed verification would
            // still show the customer a "Payment Success! ● Active" screen.
            const result = await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            })
            pending = result.pending
          } catch (err) {
            console.error('Payment verification failed:', err)
            toast.error(
              'Payment received but verification failed. Your access has not been activated — please contact support with your payment ID: ' +
                response.razorpay_payment_id,
            )
            return
          }

          if (pending) {
            toast.success('Payment received! Confirming your subscription — this can take a minute.')
          } else {
            toast.success('Payment successful! Your tests are now unlocked.')
          }
          // Store payment details so the receipt page can display real data
          sessionStorage.setItem(
            'lex_payment_receipt',
            JSON.stringify({
              paymentId: response.razorpay_payment_id,
              subscriptionId: response.razorpay_subscription_id,
              amount: '₹499.00',
              plan: 'Lex-Assess Premium',
              validity: '3 Months',
              date: new Date().toISOString(),
            })
          )
          // Hard navigate so beforeLoad re-fetches a fresh user with hasActiveSubscription: true
          window.location.href = '/dashboard/payment-success'
        },
        theme: {
          color: '#d97706',
        },
      }

      const rzp = new Razorpay(options as any)
      rzp.open()
    } catch (error) {
      console.error(error)
      toast.error('Failed to initiate payment')
    } finally {
      setSubscribing(false)
    }
  }

  const adminCards = [
    { title: 'Role', value: role, show: true },
    { title: 'Superadmin Controls', value: 'Enabled', show: hasRole(role, ['SUPERADMIN']) },
    { title: 'Admin Controls', value: 'Enabled', show: hasRole(role, ['ADMIN']) },
    { title: 'Company Controls', value: 'Enabled', show: hasRole(role, ['COMPANY']) },
  ].filter((card) => card.show)

  if (!isStudent) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {adminCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const features = [
    {
      title: 'Full Assessment Access',
      desc: 'Unlock all 150+ professional law and aptitude tests.',
      icon: <BookOpen className="h-4 w-4" />,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      title: 'Dynamic Rank Generation',
      desc: 'Get your real-time percentile and rank among thousands.',
      icon: <Trophy className="h-4 w-4" />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Professional Resume Boost',
      desc: 'Certified results to show to top law firms and companies.',
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back, <span style={{ color: '#d97706' }}>{user.name}</span>!
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage your assessment journey and expert sessions.
          </p>
        </div>
        {user.hasActiveSubscription && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Premium Active
          </div>
        )}
      </div>

      <div className="mb-12">
        <InterviewScheduleCard specialization={user.profile?.specialization} />
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Practice Assessments</h3>
        <p className="text-sm text-slate-500">Master your domain with these curated test papers.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 rounded-xl animate-pulse"
              style={{ background: '#f4f4f5' }}
            />
          ))}
        </div>
      ) : papers.length > 0 ? (
        <>
          {/* Paywall card — in normal document flow, never clipped */}
          {!user.hasActiveSubscription && (
            <div className="flex justify-center py-4">
              <div
                className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: 'linear-gradient(160deg, #ffffff 60%, #fffbeb 100%)',
                  border: '1px solid #fde68a',
                }}
              >
                {/* Top gradient bar */}
                <div
                  className="h-1.5 w-full"
                  style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706, #b45309)' }}
                />

                {/* Decorative amber blob */}
                <div
                  className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-10 pointer-events-none"
                  style={{ background: '#f59e0b' }}
                />

                <div className="px-8 pt-8 pb-4 text-center">
                  <div
                    className="mx-auto mb-5 h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                  >
                    <Lock className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Premium Assessment Area
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    You're one step away from unlocking your professional practice and ranking dashboard.
                  </p>
                </div>

                {/* Features */}
                <div className="px-8 py-4 space-y-3">
                  {features.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(245,158,11,0.04)' }}
                    >
                      <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${item.color}`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div
                  className="mx-8 my-4 px-5 py-4 rounded-xl flex items-center justify-between"
                  style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#d97706' }}>
                      Subscription Plan
                    </p>
                    <p className="text-2xl font-black text-foreground mt-0.5 flex items-baseline gap-2">
                      <span className="text-base font-semibold text-muted-foreground line-through">₹1,999</span>
                      <span>₹499</span>
                      <span className="text-sm font-normal text-muted-foreground"> / 3 months</span>
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">New customer offer</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end mb-0.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-[10px] font-semibold text-emerald-700">Secure Transaction</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">256-bit Encryption</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-8 pb-7 space-y-3">
                  <Button
                    className="w-full h-12 text-base font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-100"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(217,119,6,0.35)',
                      border: 'none',
                    }}
                    onClick={handleSubscribe}
                    disabled={subscribing}
                  >
                    {subscribing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Initializing Secure Payment...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Unlock Instant Access
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                  <div className="flex items-center justify-center gap-1.5 opacity-50">
                    <p className="text-[10px] uppercase font-bold tracking-widest">Powered by</p>
                    <span className="text-xs font-black tracking-tighter italic">Razorpay</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Papers Grid */}
          <div
            className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 transition-all duration-700 ${
              !user.hasActiveSubscription ? 'opacity-30 blur-sm pointer-events-none select-none' : ''
            }`}
          >
            {papers.map((paper) => {
              const publishedVersion = paper.versions?.find((v) => v.status === 'PUBLISHED')
              const attempt = (publishedVersion as any)?.userAttempt

              let statusBadge = null
              let buttonText = 'Start Test'
              let buttonIcon = <PlayCircle className="h-4 w-4" />
              let isDisabled = false
              let cardAccent = 'border-border'

              if (attempt) {
                if (attempt.status === 'SUBMITTED') {
                  statusBadge = (
                    <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Submitted
                    </span>
                  )
                  buttonText = 'Completed'
                  buttonIcon = <CheckCircle2 className="h-4 w-4" />
                  isDisabled = true
                  cardAccent = 'border-emerald-200'
                } else if (attempt.status === 'EXPIRED') {
                  statusBadge = (
                    <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                      Expired
                    </span>
                  )
                  buttonText = 'Attempt Expired'
                  isDisabled = true
                  cardAccent = 'border-red-200'
                } else if (attempt.status === 'STARTED') {
                  statusBadge = (
                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-semibold animate-pulse">
                      ● In Progress
                    </span>
                  )
                  buttonText = 'Resume Test'
                  buttonIcon = <RotateCcw className="h-4 w-4" />
                  cardAccent = 'border-amber-200'
                }
              }

              return (
                <Card
                  key={paper.id}
                  className={`flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${cardAccent}`}
                >
                  {/* Top accent line */}
                  <div
                    className="h-1 w-full"
                    style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base leading-snug">{paper.title}</CardTitle>
                      {statusBadge}
                    </div>
                    <CardDescription className="line-clamp-2 text-xs mt-1">
                      {paper.description || 'No description available.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 pb-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{publishedVersion?.timeLimitMinutes || 60} mins</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{publishedVersion?._count?.questions || 0} Questions</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t pt-3">
                    <Button
                      className="w-full h-9 text-sm font-semibold rounded-lg transition-all"
                      style={
                        !isDisabled
                          ? {
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: '#fff',
                              border: 'none',
                            }
                          : undefined
                      }
                      variant={isDisabled ? 'secondary' : 'default'}
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isDisabled) {
                          const url = `/dashboard/test-attempt/${publishedVersion?.id}`
                          const width = window.screen.availWidth
                          const height = window.screen.availHeight
                          window.open(
                            url,
                            'lex-test-window',
                            `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
                          )
                        }
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {buttonIcon}
                        {buttonText}
                        {!isDisabled && <ChevronRight className="h-4 w-4" />}
                      </span>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
          style={{ background: '#f9f9f6', border: '1.5px dashed #e5e5e5' }}
        >
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: '#fef3c7' }}
          >
            <BookOpen className="h-8 w-8" style={{ color: '#d97706' }} />
          </div>
          <h3 className="text-lg font-bold text-foreground">No tests found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mt-2">
            There are no published tests for your practice area yet. Please check back later.
          </p>
        </div>
      )}
    </div>
  )
}
