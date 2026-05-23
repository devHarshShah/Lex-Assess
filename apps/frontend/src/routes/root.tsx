import { createRootRoute } from '@tanstack/react-router'
import { RootLayout } from '../pages/RootLayout'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ErrorPage } from '../pages/ErrorPage'

export const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
})
