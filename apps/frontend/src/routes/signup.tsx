import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './root'
import { SignupPage } from '@/pages/SignupPage'
import { isAuthenticated } from '@/lib/auth'

export const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SignupPage,
  head: () => ({
    meta: [
      {
        title: 'Sign Up | LexAssess',
      },
      {
        name: 'description',
        content: 'Join LexAssess and start your journey towards merit-based law placements.',
      },
    ],
  }),
})
