import { createRoute, redirect } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { AdminSpecializationPapersPage } from '@/pages/AdminSpecializationPapersPage'
import { getActiveRole } from '@/lib/auth'

export const dashboardSpecializationPapersRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/specializations/$specializationId/papers',
  beforeLoad: ({ context }) => {
    const role = getActiveRole(context.user)
    if (role !== 'SUPERADMIN' && role !== 'ADMIN') throw redirect({ to: '/dashboard' })
  },
  component: AdminSpecializationPapersPage,
})
