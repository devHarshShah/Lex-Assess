import { useEffect } from 'react'
import { Outlet, HeadContent, useNavigate, useLocation } from '@tanstack/react-router'
import { clearAuth, UNAUTHORIZED_EVENT } from '@/lib/auth-storage'

export function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth()
      
      const currentPath = location.pathname
      if (currentPath !== '/login' && currentPath !== '/signup') {
        navigate({ to: '/login' })
      }
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [navigate, location.pathname])

  return (
    <>
      <HeadContent />
      <Outlet />
    </>
  )
}
