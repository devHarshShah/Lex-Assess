import { createRoute } from '@tanstack/react-router'
import { PrivacyPolicyPage } from '../pages/PrivacyPolicyPage'
import { rootRoute } from './root'

export const privacyPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy-policy',
  component: PrivacyPolicyPage,
  head: () => ({
    meta: [
      {
        title: 'Privacy Policy | LexAssess',
      },
      {
        name: 'description',
        content: 'How LexAssess collects, uses, and protects your personal data under the Digital Personal Data Protection Act, 2023.',
      },
    ],
  }),
})
