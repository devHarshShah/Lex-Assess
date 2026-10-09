import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminCrmPage } from '@/pages/SuperadminCrmPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardCrmRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/crm',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminCrmPage,
})
