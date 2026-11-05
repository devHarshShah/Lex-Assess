import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminPricingPage } from '@/pages/SuperadminPricingPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardPricingRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/pricing',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminPricingPage,
})
