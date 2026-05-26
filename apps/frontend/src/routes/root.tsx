import { createRootRoute } from '@tanstack/react-router'
import { RootLayout } from '../pages/RootLayout'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ErrorPage } from '../pages/ErrorPage'

export const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
  head: () => ({
    meta: [
      {
        title: 'LexAssess | National Law Placement Portal',
      },
      {
        name: 'description',
        content:
          'A merit-based assessment and ranking platform for law students and firms in India. Get assessed, ranked, and discovered by top law firms.',
      },
      {
        name: 'keywords',
        content:
          'law placement, legal internships, law student ranking, law firms india, merit-based law placement',
      },
      {
        property: 'og:title',
        content: 'LexAssess | National Law Placement Portal',
      },
      {
        property: 'og:description',
        content:
          'A merit-based assessment and ranking platform for law students and firms in India.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:image',
        content: '/logo.png',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'LexAssess | National Law Placement Portal',
      },
      {
        name: 'twitter:description',
        content:
          'A merit-based assessment and ranking platform for law students and firms in India.',
      },
    ],
  }),
})
