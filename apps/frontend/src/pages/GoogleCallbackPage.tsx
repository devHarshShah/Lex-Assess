import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Scale } from 'lucide-react'
import { clearAuth, exchangeGoogleCode, storeAuth } from '@/lib/auth'

export function GoogleCallbackPage() {
  const navigate = useNavigate()
  const hasExchanged = useRef(false)

  useEffect(() => {
    if (hasExchanged.current) return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code) {
      clearAuth()
      void navigate({ to: '/login', replace: true })
      return
    }

    hasExchanged.current = true

    void (async () => {
      try {
        const auth = await exchangeGoogleCode(code, state || undefined)
        storeAuth(auth)
        await navigate({
          to: auth.user.role === 'USER' && !auth.user.profileCompleted ? '/dashboard/setup' : '/dashboard',
          replace: true,
        })
      } catch {
        clearAuth()
        await navigate({ to: '/login', replace: true })
      }
    })()
  }, [navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border bg-card/90 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Scale className="size-6 text-primary" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Signing You In</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifying your Google account and preparing your LexAssess workspace.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary" />
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">Secure OAuth Handshake</p>
      </div>
    </div>
  )
}
