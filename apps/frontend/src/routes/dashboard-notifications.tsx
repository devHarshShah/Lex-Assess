import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminNotificationsPage } from '@/pages/SuperadminNotificationsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardNotificationsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/notifications',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminNotificationsPage,
})

