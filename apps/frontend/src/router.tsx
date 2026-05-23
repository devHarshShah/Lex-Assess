import { createRouter } from '@tanstack/react-router'
import { homeRoute } from './routes/home'
import { rootRoute } from './routes/root'
import { dashboardRoute, dashboardIndexRoute } from './routes/dashboard'
import { loginRoute } from './routes/login'
import { googleCallbackRoute } from './routes/google-callback'
import { signupRoute } from './routes/signup'

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  signupRoute,
  googleCallbackRoute,
  dashboardRoute.addChildren([dashboardIndexRoute]),
])

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
