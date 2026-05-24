import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminDegreesPage } from '@/pages/SuperadminDegreesPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardDegreesRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/degrees',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') throw redirect({ to: '/dashboard' })
  },
  component: SuperadminDegreesPage,
})
