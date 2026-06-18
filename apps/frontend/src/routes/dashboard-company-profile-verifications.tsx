import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminCompanyProfileVerificationsPage } from '@/pages/SuperadminCompanyProfileVerificationsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardCompanyProfileVerificationsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/company-profile-verifications',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') throw redirect({ to: '/dashboard' })
  },
  component: SuperadminCompanyProfileVerificationsPage,
})
