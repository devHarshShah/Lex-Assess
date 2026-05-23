import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './root'
import { SignupPage } from '@/pages/SignupPage'
import { getStoredToken } from '@/lib/auth'

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: () => {
    if (getStoredToken()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SignupPage,
})
