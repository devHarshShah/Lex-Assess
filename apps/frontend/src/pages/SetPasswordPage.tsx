import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AuthHeroArt } from '@/components/auth-hero-art'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setPasswordWithToken } from '@/lib/auth'

export function SetPasswordPage() {
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError('Missing or invalid token. Please use the link from your email.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await setPasswordWithToken(token, password)
      setSuccess(true)
      setTimeout(() => navigate({ to: '/login' }), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <section className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md space-y-7">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">LexAssess</p>
            <h1 className="text-3xl font-semibold">Set Your Password</h1>
            <p className="text-sm text-muted-foreground">Choose a password to finish setting up your account.</p>
          </div>

          {success ? (
            <p className="text-sm text-green-600">Password set successfully. Redirecting to login…</p>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                Set Password
              </Button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          )}

          <p className="text-sm text-muted-foreground">
            Already set your password?{' '}
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </section>

      <section className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-background via-muted to-background p-10 border-l">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex h-full w-full flex-col justify-center">
          <AuthHeroArt variant="login" />
        </div>
      </section>
    </div>
  )
}
