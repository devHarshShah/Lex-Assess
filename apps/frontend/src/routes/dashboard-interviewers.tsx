import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { AdminInterviewerManagementPage } from '@/pages/AdminInterviewerManagementPage'
import { getActiveRole, hasRole } from '@/lib/auth'

export const dashboardInterviewersRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/interviewers',
  beforeLoad: ({ context }: any) => {
    const role = getActiveRole(context.user)
    if (!hasRole(role, ['ADMIN'])) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AdminInterviewerManagementPage,
})
