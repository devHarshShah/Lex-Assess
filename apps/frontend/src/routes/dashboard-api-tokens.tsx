import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminApiTokensPage } from '@/pages/SuperadminApiTokensPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardApiTokensRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/api-tokens',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminApiTokensPage,
})
