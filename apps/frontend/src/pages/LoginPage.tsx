import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Scale, BriefcaseBusiness, FileCheck2, ShieldCheck } from 'lucide-react'
import { AuthHeroArt } from '@/components/auth-hero-art'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/google-icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clearAuth, getApiBaseUrl, loginWithPassword, storeAuth } from '@/lib/auth'

type LoginType = 'student' | 'firm'

export function LoginPage() {
  const navigate = useNavigate()
  const [loginType, setLoginType] = useState<LoginType>('student')
  const [email, setEmail] = useState('student@lexassess.com')
  const [password, setPassword] = useState('Pass@123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function onTypeSelect(type: LoginType) {
    setLoginType(type)
    setEmail(type === 'firm' ? 'company@lexassess.com' : 'student@lexassess.com')
    setPassword('Pass@123')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const auth = await loginWithPassword(email, password)
      storeAuth(auth)
      await navigate({ to: auth.user.role === 'USER' && !auth.user.profileCompleted ? '/dashboard/setup' : '/dashboard' })
    } catch (err) {
      clearAuth()
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function onGoogleOAuthStart() {
    window.location.href = `${getApiBaseUrl()}/auth/google/start`
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <section className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md space-y-7">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">LexAssess</p>
            <h1 className="text-3xl font-semibold">Continue Your Legal Work</h1>
            <p className="text-sm text-muted-foreground">Pick your workspace and get back to active assessments.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <Button type="button" variant={loginType === 'student' ? 'default' : 'ghost'} onClick={() => onTypeSelect('student')}>
              Student Login
            </Button>
            <Button type="button" variant={loginType === 'firm' ? 'default' : 'ghost'} onClick={() => onTypeSelect('firm')}>
              Firm Login
            </Button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              Continue Working
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={onGoogleOAuthStart} disabled={loading}>
              <span className="inline-flex items-center gap-2">
                <GoogleIcon />
                Continue with Google
              </span>
            </Button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>

          <p className="text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/signup" className="font-medium text-foreground underline underline-offset-4">
              Create your account
            </Link>
          </p>
        </div>
      </section>

      <section className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-background via-muted to-background p-10 border-l">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workstream</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight">Every clause. Every step. In momentum.</h2>
          </div>

          <AuthHeroArt variant="login" />

          <div className="grid gap-4">
            <div className="rounded-2xl border bg-background/70 p-5 backdrop-blur">
              <p className="text-sm text-foreground/90">“Justice will not be served until those who are unaffected are as outraged as those who are.”</p>
              <p className="mt-3 text-xs text-muted-foreground">Benjamin Franklin</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border bg-background/70 p-4">
                <Scale className="mb-2 size-5 text-primary" />
                <p className="text-sm font-medium">Case Precision</p>
                <p className="mt-1 text-xs text-muted-foreground">Track legal accuracy and decision quality.</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <FileCheck2 className="mb-2 size-5 text-primary" />
                <p className="text-sm font-medium">Draft Discipline</p>
                <p className="mt-1 text-xs text-muted-foreground">Keep every submission review-ready.</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <BriefcaseBusiness className="mb-2 size-5 text-primary" />
                <p className="text-sm font-medium">Firm Benchmarks</p>
                <p className="mt-1 text-xs text-muted-foreground">Compare teams on practical outcomes.</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <ShieldCheck className="mb-2 size-5 text-primary" />
                <p className="text-sm font-medium">Trusted Process</p>
                <p className="mt-1 text-xs text-muted-foreground">Role-based controls from day one.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
