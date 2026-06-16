import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Scale, Landmark, Users, Sparkles } from 'lucide-react'
import { AuthHeroArt } from '@/components/auth-hero-art'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/google-icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clearAuth, getApiBaseUrl, registerWithPassword, storeAuth, type Role } from '@/lib/auth'
import { isPublicEmailProvider } from '@/lib/utils'

type SignupType = 'student' | 'company'

export function SignupPage() {
  const navigate = useNavigate()
  const [signupType, setSignupType] = useState<SignupType>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const role: Role = signupType === 'company' ? 'COMPANY' : 'USER'

    if (role === 'COMPANY' && isPublicEmailProvider(email)) {
      setError('Please use a company email address to register as a company.')
      setLoading(false)
      return
    }

    try {
      const auth = await registerWithPassword({ name, email, password, role })
      storeAuth(auth)
      await navigate({ to: auth.user.role === 'USER' && !auth.user.profileCompleted ? '/dashboard/setup' : '/dashboard' })
    } catch (err) {
      clearAuth()
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  function onGoogleOAuthStart() {
    const role = signupType === 'company' ? 'COMPANY' : 'USER'
    window.location.href = `${getApiBaseUrl()}/auth/google/start?role=${role}`
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <section className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md space-y-7">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">LexAssess</p>
            <h1 className="text-3xl font-semibold">Start Your Legal Journey</h1>
            <p className="text-sm text-muted-foreground">Choose your path and build your legal edge from day one.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <Button type="button" variant={signupType === 'student' ? 'default' : 'ghost'} onClick={() => setSignupType('student')}>
              Register Student
            </Button>
            <Button type="button" variant={signupType === 'company' ? 'default' : 'ghost'} onClick={() => setSignupType('company')}>
              Register Company
            </Button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              Begin as {signupType === 'company' ? 'Company' : 'Student'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={onGoogleOAuthStart} disabled={loading}>
              <span className="inline-flex items-center gap-2">
                <GoogleIcon />
                Sign up with Google
              </span>
            </Button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>

          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Continue working
            </Link>
          </p>
        </div>
      </section>

      <section className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-muted via-background to-muted p-10 border-l">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Launchpad</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight">Law rewards prepared minds and disciplined builders.</h2>
          </div>

          <AuthHeroArt variant="signup" />

          <div className="grid gap-4">
            <div className="rounded-2xl border bg-background/70 p-5 backdrop-blur">
              <p className="text-sm text-foreground/90">“The good lawyer is not the man who has an eye to every side and angle of contingency, but who throws himself on your part so heartily, that he can get you out of a scrape.”</p>
              <p className="mt-3 text-xs text-muted-foreground">Ralph Waldo Emerson</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border bg-background/70 p-4">
                <Scale className="mb-2 size-5 text-primary" />
                <p className="text-sm font-medium">Legal Rigor</p>
                <p className="mt-1 text-xs text-muted-foreground">Train with assessment-first discipline.</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <Landmark className="mb-2 size-5 text-primary" />
                <p className="text-sm font-medium">Courtroom Thinking</p>
                <p className="mt-1 text-xs text-muted-foreground">Reason under pressure, not theory alone.</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <Users className="mb-2 size-5 text-primary" />
                <p className="text-sm font-medium">Team Growth</p>
                <p className="mt-1 text-xs text-muted-foreground">Scale capability across your firm.</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4">
                <Sparkles className="mb-2 size-5 text-primary" />
                <p className="text-sm font-medium">Career Signal</p>
                <p className="mt-1 text-xs text-muted-foreground">Build a profile that stands out.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
