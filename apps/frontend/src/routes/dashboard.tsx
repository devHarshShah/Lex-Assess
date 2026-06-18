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

      const isSetupOrSuccess =
        pathname === '/dashboard/setup' ||
        pathname === '/dashboard/company-setup' ||
        pathname === '/dashboard/payment-success'

      if (user.role === 'USER' && !user.profileCompleted && !isSetupOrSuccess) {
        throw redirect({ to: '/dashboard/setup' })
      }
      if (user.role === 'COMPANY' && !user.profileCompleted && !isSetupOrSuccess) {
        throw redirect({ to: '/dashboard/company-setup' })
      }

      storeUser(user)
      return { user }
    } catch (error) {
      if (isRedirect(error)) {
        throw error
      }
      const cachedUser = getStoredUser()
      const { pathname } = window.location
      const isSetupOrSuccess =
        pathname === '/dashboard/setup' ||
        pathname === '/dashboard/company-setup' ||
        pathname === '/dashboard/payment-success'

      if (cachedUser) {
        if (cachedUser.role === 'USER' && !cachedUser.profileCompleted && !isSetupOrSuccess) {
          throw redirect({ to: '/dashboard/setup' })
        }
        if (cachedUser.role === 'COMPANY' && !cachedUser.profileCompleted && !isSetupOrSuccess) {
          throw redirect({ to: '/dashboard/company-setup' })
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
