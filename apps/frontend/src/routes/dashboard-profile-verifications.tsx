import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminProfileVerificationsPage } from '@/pages/SuperadminProfileVerificationsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardProfileVerificationsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/profile-verifications',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') throw redirect({ to: '/dashboard' })
  },
  component: SuperadminProfileVerificationsPage,
})
