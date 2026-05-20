import { createRouter } from '@tanstack/react-router'
import { homeRoute } from './routes/home'
import { rootRoute } from './routes/root'

const routeTree = rootRoute.addChildren([homeRoute])

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
