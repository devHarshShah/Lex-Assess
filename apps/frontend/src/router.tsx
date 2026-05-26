import { createRouter } from '@tanstack/react-router'
import { homeRoute } from './routes/home'
import { rootRoute } from './routes/root'
import { dashboardRoute, dashboardIndexRoute } from './routes/dashboard'
import { dashboardUsersRoute } from './routes/dashboard-users'
import { dashboardSpecializationsRoute } from './routes/dashboard-specializations'
import { dashboardCollegesRoute } from './routes/dashboard-colleges'
import { dashboardDegreesRoute } from './routes/dashboard-degrees'
import { dashboardProfileVerificationsRoute } from './routes/dashboard-profile-verifications'
import { dashboardProfileRoute } from './routes/dashboard-profile'
import { dashboardSpecializationPapersRoute } from './routes/dashboard-specialization-papers'
import { dashboardPaperBuilderRoute } from './routes/dashboard-paper-builder'
import { dashboardAllPapersRoute } from './routes/dashboard-all-papers'
import { dashboardTestAttemptRoute } from './routes/dashboard-test-attempt'
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
  dashboardTestAttemptRoute,
  dashboardRoute.addChildren([
    dashboardIndexRoute,
    dashboardUsersRoute,
    dashboardSpecializationsRoute,
    dashboardCollegesRoute,
    dashboardDegreesRoute,
    dashboardProfileVerificationsRoute,
    dashboardProfileRoute,
    dashboardSpecializationPapersRoute,
    dashboardPaperBuilderRoute,
    dashboardAllPapersRoute,
  ]),
])

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
