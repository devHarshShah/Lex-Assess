import { createRouter } from '@tanstack/react-router'
import { homeRoute } from './routes/home'
import { rootRoute } from './routes/root'
import { directoryRoute } from './routes/directory'
import { dashboardRoute, dashboardIndexRoute } from './routes/dashboard'
import { dashboardUsersRoute } from './routes/dashboard-users'
import { dashboardSpecializationsRoute } from './routes/dashboard-specializations'
import { dashboardCollegesRoute } from './routes/dashboard-colleges'
import { dashboardDegreesRoute } from './routes/dashboard-degrees'
import { dashboardProfileVerificationsRoute } from './routes/dashboard-profile-verifications'
import { dashboardProfileRoute } from './routes/dashboard-profile'
import { dashboardProfileSetupRoute } from './routes/dashboard-profile-setup'
import { dashboardSpecializationPapersRoute } from './routes/dashboard-specialization-papers'
import { dashboardPaperBuilderRoute } from './routes/dashboard-paper-builder'
import { dashboardAllPapersRoute } from './routes/dashboard-all-papers'
import { dashboardTestAttemptRoute } from './routes/dashboard-test-attempt'
import { dashboardSubmissionsRoute } from './routes/dashboard-submissions'
import { dashboardSpecializationSubmissionsRoute } from './routes/dashboard-specialization-submissions'
import { dashboardSubmissionScoringRoute } from './routes/dashboard-submission-scoring'
import { dashboardPaymentSuccessRoute } from './routes/dashboard-payment-success'
import { dashboardNotificationsRoute } from './routes/dashboard-notifications'
import { dashboardInterviewersRoute } from './routes/dashboard-interviewers'
import { loginRoute } from './routes/login'
import { signupRoute } from './routes/signup'
import { googleCallbackRoute } from './routes/google-callback'

const routeTree = rootRoute.addChildren([
  homeRoute,
  directoryRoute,
  loginRoute,
  signupRoute,
  googleCallbackRoute,
  dashboardTestAttemptRoute,
  dashboardRoute.addChildren([
    dashboardIndexRoute,
    dashboardUsersRoute,
    dashboardSpecializationsRoute,
    dashboardCollegesRoute,
    dashboardDegreesRoute,
    dashboardProfileVerificationsRoute,
    dashboardProfileRoute,
    dashboardProfileSetupRoute,
    dashboardSpecializationPapersRoute,
    dashboardPaperBuilderRoute,
    dashboardAllPapersRoute,
    dashboardSubmissionsRoute,
    dashboardSpecializationSubmissionsRoute,
    dashboardSubmissionScoringRoute,
    dashboardPaymentSuccessRoute,
    dashboardNotificationsRoute,
    dashboardInterviewersRoute as any,
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
