import { useEffect, useState } from 'react'
import { Outlet, HeadContent, useNavigate, useLocation } from '@tanstack/react-router'
import { DisclaimerGate } from '@/components/DisclaimerGate'
import { MaintenanceScreen } from '@/components/MaintenanceScreen'
import { clearAuth, MAINTENANCE_EVENT, UNAUTHORIZED_EVENT } from '@/lib/auth-storage'
import { getStoredUser } from '@/lib/auth'
import { fetchMaintenanceStatus } from '@/lib/maintenance'

export function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  // Message to show while maintenance mode is on; null when the site is open
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchMaintenanceStatus()
      .then((status) => setMaintenanceMessage(status.enabled ? status.message : null))
      .catch(() => {})

    const handleMaintenance = (event: Event) => {
      setMaintenanceMessage((event as CustomEvent<string>).detail || 'LexAssess is under maintenance.')
    }
    window.addEventListener(MAINTENANCE_EVENT, handleMaintenance)
    return () => window.removeEventListener(MAINTENANCE_EVENT, handleMaintenance)
  }, [])

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

  // Superadmins keep full access; everyone else sees the maintenance screen (login stays
  // reachable so a superadmin can sign in).
  const isSuperadmin = getStoredUser()?.role === 'SUPERADMIN'
  if (maintenanceMessage && !isSuperadmin && location.pathname !== '/login') {
    return (
      <>
        <HeadContent />
        <MaintenanceScreen message={maintenanceMessage} />
      </>
    )
  }

  return (
    <>
      <HeadContent />
      <Outlet />
      <DisclaimerGate />
    </>
  )
}
