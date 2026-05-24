import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminSpecializationsPage } from '@/pages/SuperadminSpecializationsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardSpecializationsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/specializations',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') throw redirect({ to: '/dashboard' })
  },
  component: SuperadminSpecializationsPage,
})
