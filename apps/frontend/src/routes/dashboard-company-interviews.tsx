import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { SuperadminCompanyInterviewsPage } from '@/pages/SuperadminCompanyInterviewsPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardCompanyInterviewsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/company-interviews',
  validateSearch: (search: Record<string, unknown>): { student?: string } => ({
    student: typeof search.student === 'string' ? search.student : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (getActiveRole(context.user) !== 'SUPERADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SuperadminCompanyInterviewsPage,
})
