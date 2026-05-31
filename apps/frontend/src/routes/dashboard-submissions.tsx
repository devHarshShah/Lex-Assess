import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { AdminSubmissionsSummaryPage } from '../pages/AdminSubmissionsSummaryPage'

export const dashboardSubmissionsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/submissions',
  component: AdminSubmissionsSummaryPage,
})
