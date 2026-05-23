import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './root'

export const profileVerificationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/setup/verification',
  beforeLoad: () => {
    throw redirect({ to: '/profile/setup' })
  },
  component: () => null,
})
