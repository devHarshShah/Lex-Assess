import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminAnalyticsPage } from '@/pages/SuperadminAnalyticsPage'
import { SuperadminEmailAnalyticsPage } from '@/pages/SuperadminEmailAnalyticsPage'
import { SuperadminTemplateAnalyticsPage } from '@/pages/SuperadminTemplateAnalyticsPage'
import { SuperadminCouponAnalyticsPage } from '@/pages/SuperadminCouponAnalyticsPage'
import { SuperadminGrowthAnalyticsPage } from '@/pages/SuperadminGrowthAnalyticsPage'
import { getActiveRole } from '@/lib/auth'

const superadminOnly = ({ context }: { context: { user: Parameters<typeof getActiveRole>[0] } }) => {
  if (getActiveRole(context.user) !== 'SUPERADMIN') {
    throw redirect({ to: '/dashboard' })
  }
}

const page = (path: string, component: () => React.JSX.Element) =>
  createRoute({ getParentRoute: () => dashboardRoute, path, beforeLoad: superadminOnly, component })

export const dashboardAnalyticsRoute = page('/analytics', () => <SuperadminAnalyticsPage view="overview" />)
export const dashboardAnalyticsEmailRoute = page('/analytics/email', SuperadminEmailAnalyticsPage)
export const dashboardAnalyticsTemplatesRoute = page('/analytics/templates', SuperadminTemplateAnalyticsPage)
export const dashboardAnalyticsCouponsRoute = page('/analytics/coupons', SuperadminCouponAnalyticsPage)
export const dashboardAnalyticsCrmRoute = page('/analytics/crm', () => <SuperadminAnalyticsPage view="crm" />)
export const dashboardAnalyticsInterviewsRoute = page('/analytics/interviews', () => <SuperadminAnalyticsPage view="interviews" />)
export const dashboardAnalyticsUsersRoute = page('/analytics/users', () => <SuperadminAnalyticsPage view="users" />)
export const dashboardAnalyticsGrowthRoute = page('/analytics/growth', SuperadminGrowthAnalyticsPage)
