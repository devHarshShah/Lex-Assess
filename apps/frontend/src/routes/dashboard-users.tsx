import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminUsersPage } from '@/pages/SuperadminUsersPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardUsersRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/users',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminUsersPage,
})
