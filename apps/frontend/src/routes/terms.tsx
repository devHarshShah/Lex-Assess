import { createRoute } from '@tanstack/react-router'
import { TermsPage } from '../pages/TermsPage'
import { rootRoute } from './root'

export const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsPage,
  head: () => ({
    meta: [
      {
        title: 'Terms of Use | LexAssess',
      },
      {
        name: 'description',
        content: 'The terms that govern your use of LexAssess assessments, rankings, certificates and internship facilitation.',
      },
    ],
  }),
})
