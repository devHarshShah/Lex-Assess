import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'
import { SetPasswordPage } from '@/pages/SetPasswordPage'

export const setPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/set-password',
  component: SetPasswordPage,
  head: () => ({
    meta: [
      {
        title: 'Set Password | LexAssess',
      },
    ],
  }),
})
