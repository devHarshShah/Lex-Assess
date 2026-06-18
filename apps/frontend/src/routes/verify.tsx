import { createRoute } from '@tanstack/react-router'

import { VerifyCertificatePage } from '@/pages/VerifyCertificatePage'

import { rootRoute } from './root'

export const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify/$code',
  component: VerifyCertificatePage,
  head: () => ({
    meta: [
      {
        title: 'Certificate Verification | LexAssess',
      },
    ],
  }),
})
