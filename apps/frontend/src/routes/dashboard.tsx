import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './root'
import { DashboardLayout } from '../pages/DashboardLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { clearAuth, fetchCurrentUser, getStoredToken, getStoredUser, storeUser } from '@/lib/auth'

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: async () => {
    const token = getStoredToken()

    if (!token) {
      throw redirect({ to: '/login' })
    }

    try {
      const user = await fetchCurrentUser()
      storeUser(user)
      return { user }
    } catch {
      const cachedUser = getStoredUser()
      if (cachedUser) {
        return { user: cachedUser }
      }

      clearAuth()
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardLayout,
})

export const dashboardIndexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: DashboardPage,
})
