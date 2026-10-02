import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminCouponsPage } from '@/pages/SuperadminCouponsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardCouponsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/coupons',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminCouponsPage,
})
