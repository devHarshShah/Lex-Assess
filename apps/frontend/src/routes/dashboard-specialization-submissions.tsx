import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { AdminSpecializationSubmissionsPage } from '../pages/AdminSpecializationSubmissionsPage'

export const dashboardSpecializationSubmissionsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/submissions/specialization/$specializationId',
  component: AdminSpecializationSubmissionsPage,
})
