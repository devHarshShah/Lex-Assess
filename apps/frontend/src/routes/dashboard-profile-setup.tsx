import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { ProfileSetupPage } from '@/pages/ProfileSetupPage'

export const dashboardProfileSetupRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/setup',
  component: () => {
    const user = dashboardProfileSetupRoute.useRouteContext().user
    return <ProfileSetupPage user={user} mode="setup" />
  },
})
