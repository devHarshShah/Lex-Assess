import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminSpecializationsPage } from '@/pages/SuperadminSpecializationsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardSpecializationsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/specializations',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') throw redirect({ to: '/dashboard' })
  },
  component: SuperadminSpecializationsPage,
})
