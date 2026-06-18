import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { AdminRankingPage } from '@/pages/AdminRankingPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardRankingRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/ranking',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') throw redirect({ to: '/dashboard' })
  },
  component: AdminRankingPage,
})
