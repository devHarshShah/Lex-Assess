import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './root'
import { fetchCurrentUser, getStoredToken, storeUser } from '@/lib/auth'
import { ProfileSetupPage } from '@/pages/ProfileSetupPage'

export const profileSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/setup',
  beforeLoad: async () => {
    const token = getStoredToken()
    if (!token) {
      throw redirect({ to: '/login' })
    }

    const user = await fetchCurrentUser()
    storeUser(user)
    if (user.role !== 'USER') {
      throw redirect({ to: '/dashboard' })
    }
    if (user.profileCompleted) {
      throw redirect({ to: '/dashboard' })
    }
    return { user }
  },
  component: () => {
    const user = profileSetupRoute.useRouteContext().user
    return <ProfileSetupPage user={user} />
  },
})
