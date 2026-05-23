import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clearAuth, registerWithPassword, storeAuth, type Role } from '@/lib/auth'

type SignupType = 'student' | 'firm'

export function SignupForm({ className, ...props }: React.ComponentProps<'div'>) {
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

    const role: Role = signupType === 'firm' ? 'COMPANY' : 'USER'

    try {
      const auth = await registerWithPassword({ name, email, password, role })
      storeAuth(auth)
      await navigate({ to: '/dashboard' })
    } catch (err) {
      clearAuth()
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Create account</h1>
                <p className="text-balance text-muted-foreground">Register as Student or Firm</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <Button type="button" variant={signupType === 'student' ? 'default' : 'ghost'} onClick={() => setSignupType('student')}>
                  Student
                </Button>
                <Button type="button" variant={signupType === 'firm' ? 'default' : 'ghost'} onClick={() => setSignupType('firm')}>
                  Firm
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
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
                Sign up as {signupType === 'firm' ? 'Firm' : 'Student'}
              </Button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="text-center text-sm">
                Already have an account?{' '}
                <Link to="/login" className="underline underline-offset-4">
                  Login
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
