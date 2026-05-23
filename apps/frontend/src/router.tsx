import { createRouter } from '@tanstack/react-router'
import { homeRoute } from './routes/home'
import { rootRoute } from './routes/root'
import { dashboardRoute, dashboardIndexRoute } from './routes/dashboard'
import { dashboardUsersRoute } from './routes/dashboard-users'
import { dashboardProfileRoute } from './routes/dashboard-profile'
import { loginRoute } from './routes/login'
import { googleCallbackRoute } from './routes/google-callback'
import { signupRoute } from './routes/signup'
import { profileSetupRoute } from './routes/profile-setup'
import { profileVerificationRoute } from './routes/profile-verification'

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  signupRoute,
  googleCallbackRoute,
  profileSetupRoute,
  profileVerificationRoute,
  dashboardRoute.addChildren([dashboardIndexRoute, dashboardUsersRoute, dashboardProfileRoute]),
])

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
