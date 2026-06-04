import { createRoute } from '@tanstack/react-router'
import { dashboardRoute } from './dashboard'
import { PaymentSuccessPage } from '../pages/PaymentSuccessPage'

export const dashboardPaymentSuccessRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/payment-success',
  component: PaymentSuccessPage,
})
