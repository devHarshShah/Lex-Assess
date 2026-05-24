import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminAllPapersPage } from '@/pages/SuperadminAllPapersPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardAllPapersRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/all-papers',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminAllPapersPage,
})
