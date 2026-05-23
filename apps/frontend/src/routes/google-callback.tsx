import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'
import { GoogleCallbackPage } from '@/pages/GoogleCallbackPage'

export const googleCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/google/callback',
  component: GoogleCallbackPage,
})
