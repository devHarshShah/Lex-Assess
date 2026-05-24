import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { AdminPaperBuilderPage } from '@/pages/AdminPaperBuilderPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardPaperBuilderRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/papers/$versionId/builder',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') throw redirect({ to: '/dashboard' })
  },
  component: AdminPaperBuilderPage,
})
