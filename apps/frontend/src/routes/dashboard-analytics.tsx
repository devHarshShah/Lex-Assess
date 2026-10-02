import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminAnalyticsPage } from '@/pages/SuperadminAnalyticsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardAnalyticsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/analytics',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminAnalyticsPage,
})
