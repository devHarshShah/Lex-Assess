import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './root'
import { LoginPage } from '@/pages/LoginPage'
import { getStoredToken } from '@/lib/auth'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (getStoredToken()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
  head: () => ({
    meta: [
      {
        title: 'Login | LexAssess',
      },
      {
        name: 'description',
        content: 'Access your LexAssess account to manage your law profile and assessments.',
      },
    ],
  }),
})
