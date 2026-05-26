import { createRoute } from '@tanstack/react-router'
import { HomePage } from '../pages/HomePage'
import { rootRoute } from './root'

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
  head: () => ({
    meta: [
      {
        title: 'LexAssess | Merit-Based Law Placements & National Rankings',
      },
      {
        name: 'description',
        content:
          "Attempt law skill papers, earn a national rank, and get discovered by top law firms. Join India's first searchable directory of assessed law students.",
      },
    ],
  }),
})
