import { createRoute, isRedirect, redirect } from '@tanstack/react-router'
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
      const { pathname } = window.location
      
      if (user.role === 'USER' && !user.profileCompleted && pathname !== '/dashboard/setup') {
        throw redirect({ to: '/dashboard/setup' })
      }
      
      storeUser(user)
      return { user }
    } catch (error) {
      if (isRedirect(error)) {
        throw error
      }
      const cachedUser = getStoredUser()
      const { pathname } = window.location
      
      if (cachedUser) {
        if (cachedUser.role === 'USER' && !cachedUser.profileCompleted && pathname !== '/dashboard/setup') {
          throw redirect({ to: '/dashboard/setup' })
        }
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
