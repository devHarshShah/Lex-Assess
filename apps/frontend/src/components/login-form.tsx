import { FormEvent, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clearAuth, getApiBaseUrl, loginWithPassword, storeAuth } from '@/lib/auth'

type LoginType = 'student' | 'firm'

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
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
      await navigate({ to: '/dashboard' })
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
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">Login as Student or Firm</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <Button type="button" variant={loginType === 'student' ? 'default' : 'ghost'} onClick={() => onTypeSelect('student')}>
                  Student Login
                </Button>
                <Button type="button" variant={loginType === 'firm' ? 'default' : 'ghost'} onClick={() => onTypeSelect('firm')}>
                  Firm Login
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Login
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={onGoogleOAuthStart} disabled={loading}>
                Continue with Google
              </Button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="text-center text-sm">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </div>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img src="/logo.png" alt="LexAssess" className="absolute inset-0 m-auto h-28 w-28 object-contain opacity-70" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
