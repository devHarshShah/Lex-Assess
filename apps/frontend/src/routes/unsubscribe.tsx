import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'
import { UnsubscribePage } from '@/pages/UnsubscribePage'

export const unsubscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unsubscribe',
  component: UnsubscribePage,
  head: () => ({
    meta: [{ title: 'Email preferences | LexAssess' }],
  }),
})
