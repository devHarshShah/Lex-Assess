import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'

export const dashboardTestAttemptRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/test-attempt/$versionId',
  loader: ({ params }) => ({ versionId: params.versionId }),
  component: () => import('../pages/TestAttemptPage').then((m) => m.TestAttemptPage),
})
