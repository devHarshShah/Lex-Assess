import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminMaintenancePage } from '@/pages/SuperadminMaintenancePage'
import { getActiveRole } from '@/lib/auth'

export const dashboardMaintenanceRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/maintenance',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminMaintenancePage,
})
