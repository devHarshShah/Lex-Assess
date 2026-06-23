import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminCompanyProfileVerificationsPage } from '@/pages/SuperadminCompanyProfileVerificationsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardCompanyProfileVerificationsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/company-profile-verifications',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') throw redirect({ to: '/dashboard' })
  },
  component: SuperadminCompanyProfileVerificationsPage,
})
