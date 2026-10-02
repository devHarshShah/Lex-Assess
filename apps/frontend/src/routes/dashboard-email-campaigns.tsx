import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminEmailCampaignsPage } from '@/pages/SuperadminEmailCampaignsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardEmailCampaignsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/email-campaigns',
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminEmailCampaignsPage,
})
