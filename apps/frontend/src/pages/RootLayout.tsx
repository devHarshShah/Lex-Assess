import { Outlet, HeadContent } from '@tanstack/react-router'

export function RootLayout() {
  return (
    <>
      <HeadContent />
      <Outlet />
    </>
  )
}
