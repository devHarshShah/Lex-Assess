import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminCertificatesPage } from '@/pages/SuperadminCertificatesPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardIssueCertificatesRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/issue-certificates',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminCertificatesPage,
})
