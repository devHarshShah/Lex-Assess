import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { CertificatePage } from '@/pages/CertificatePage'

export const dashboardCertificateRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/certificate',
  component: CertificatePage,
})
