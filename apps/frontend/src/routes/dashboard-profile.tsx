import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { ProfilePage } from '@/pages/ProfilePage'
import { CompanyProfilePage } from '@/pages/CompanyProfilePage'
import { getActiveRole } from '@/lib/auth'

export const dashboardProfileRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/profile',
  component: () => {
    const user = dashboardProfileRoute.useRouteContext().user
    return getActiveRole(user) === 'COMPANY' ? <CompanyProfilePage /> : <ProfilePage />
  },
})
