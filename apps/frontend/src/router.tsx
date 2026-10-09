import { createRouter } from '@tanstack/react-router'
import { homeRoute } from './routes/home'
import { rootRoute } from './routes/root'
import { directoryRoute } from './routes/directory'
import { privacyPolicyRoute } from './routes/privacy-policy'
import { termsRoute } from './routes/terms'
import { dashboardRoute, dashboardIndexRoute } from './routes/dashboard'
import { dashboardUsersRoute } from './routes/dashboard-users'
import { dashboardSpecializationsRoute } from './routes/dashboard-specializations'
import { dashboardCollegesRoute } from './routes/dashboard-colleges'
import { dashboardDegreesRoute } from './routes/dashboard-degrees'
import { dashboardProfileVerificationsRoute } from './routes/dashboard-profile-verifications'
import { dashboardProfileRoute } from './routes/dashboard-profile'
import { dashboardProfileSetupRoute } from './routes/dashboard-profile-setup'
import { dashboardCompanySetupRoute } from './routes/dashboard-company-setup'
import { dashboardCompanyProfileVerificationsRoute } from './routes/dashboard-company-profile-verifications'
import { dashboardSpecializationPapersRoute } from './routes/dashboard-specialization-papers'
import { dashboardPaperBuilderRoute } from './routes/dashboard-paper-builder'
import { dashboardAllPapersRoute } from './routes/dashboard-all-papers'
import { dashboardTestAttemptRoute } from './routes/dashboard-test-attempt'
import { dashboardSubmissionsRoute } from './routes/dashboard-submissions'
import { dashboardSpecializationSubmissionsRoute } from './routes/dashboard-specialization-submissions'
import { dashboardSubmissionScoringRoute } from './routes/dashboard-submission-scoring'
import { dashboardPaymentSuccessRoute } from './routes/dashboard-payment-success'
import { dashboardNotificationsRoute } from './routes/dashboard-notifications'
import { dashboardCouponsRoute } from './routes/dashboard-coupons'
import { dashboardEmailCampaignsRoute } from './routes/dashboard-email-campaigns'
import { unsubscribeRoute } from './routes/unsubscribe'
import { dashboardAnalyticsRoute } from './routes/dashboard-analytics'
import { dashboardCompanyInterviewsRoute } from './routes/dashboard-company-interviews'
import { dashboardCrmRoute } from './routes/dashboard-crm'
import { dashboardInterviewersRoute } from './routes/dashboard-interviewers'
import { dashboardRankingRoute } from './routes/dashboard-ranking'
import { dashboardCertificateRoute } from './routes/dashboard-certificate'
import { loginRoute } from './routes/login'
import { signupRoute } from './routes/signup'
import { googleCallbackRoute } from './routes/google-callback'
import { setPasswordRoute } from './routes/set-password'
import { verifyRoute } from './routes/verify'

const routeTree = rootRoute.addChildren([
  homeRoute,
  directoryRoute,
  privacyPolicyRoute,
  termsRoute,
  verifyRoute,
  loginRoute,
  signupRoute,
  googleCallbackRoute,
  setPasswordRoute,
  unsubscribeRoute,
  dashboardTestAttemptRoute,
  dashboardRoute.addChildren([
    dashboardIndexRoute,
    dashboardUsersRoute,
    dashboardSpecializationsRoute,
    dashboardCollegesRoute,
    dashboardDegreesRoute,
    dashboardProfileVerificationsRoute,
    dashboardCompanyProfileVerificationsRoute,
    dashboardProfileRoute,
    dashboardProfileSetupRoute,
    dashboardCompanySetupRoute,
    dashboardSpecializationPapersRoute,
    dashboardPaperBuilderRoute,
    dashboardAllPapersRoute,
    dashboardSubmissionsRoute,
    dashboardSpecializationSubmissionsRoute,
    dashboardSubmissionScoringRoute,
    dashboardPaymentSuccessRoute,
    dashboardNotificationsRoute,
    dashboardCouponsRoute,
    dashboardEmailCampaignsRoute,
    dashboardAnalyticsRoute,
    dashboardCompanyInterviewsRoute,
    dashboardCrmRoute,
    dashboardInterviewersRoute as any,
    dashboardRankingRoute,
    dashboardCertificateRoute,
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
