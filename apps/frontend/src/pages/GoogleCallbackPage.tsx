import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { clearAuth, exchangeGoogleCode, storeAuth } from '@/lib/auth'

export function GoogleCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
      clearAuth()
      void navigate({ to: '/login', replace: true })
      return
    }

    void (async () => {
      try {
        const auth = await exchangeGoogleCode(code)
        storeAuth(auth)
        await navigate({ to: '/dashboard', replace: true })
      } catch {
        clearAuth()
        await navigate({ to: '/login', replace: true })
      }
    })()
  }, [navigate])

  return <div className="p-6 text-sm text-muted-foreground">Completing Google sign-in...</div>
}
