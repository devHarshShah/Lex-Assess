import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { CompanyProfileSetupPage } from '@/pages/CompanyProfileSetupPage'

export const dashboardCompanySetupRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/company-setup',
  component: () => {
    const user = dashboardCompanySetupRoute.useRouteContext().user
    return <CompanyProfileSetupPage user={user} mode="setup" />
  },
})
