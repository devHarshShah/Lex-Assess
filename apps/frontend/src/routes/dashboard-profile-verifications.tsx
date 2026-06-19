import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminProfileVerificationsPage } from '@/pages/SuperadminProfileVerificationsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardProfileVerificationsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/profile-verifications',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') throw redirect({ to: '/dashboard' })
  },
  component: SuperadminProfileVerificationsPage,
})
