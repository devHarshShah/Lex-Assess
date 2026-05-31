import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { AdminSubmissionScoringPage } from '../pages/AdminSubmissionScoringPage'

export const dashboardSubmissionScoringRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/submissions/$submissionId/score',
  component: AdminSubmissionScoringPage,
})
