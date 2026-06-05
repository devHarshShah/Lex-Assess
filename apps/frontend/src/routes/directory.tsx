import { createRoute } from '@tanstack/react-router'

import { DirectoryPage } from '@/pages/DirectoryPage'

import { rootRoute } from './root'

export const directoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/directory',
  component: DirectoryPage,
  head: () => ({
    meta: [
      {
        title: 'Student Directory | LexAssess',
      },
      {
        name: 'description',
        content:
          'Browse the LexAssess student directory by rank and practice area.',
      },
    ],
  }),
})
