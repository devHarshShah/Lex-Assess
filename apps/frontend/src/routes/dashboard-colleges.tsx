import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminCollegesPage } from '@/pages/SuperadminCollegesPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardCollegesRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/colleges',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') throw redirect({ to: '/dashboard' })
  },
  component: SuperadminCollegesPage,
})
