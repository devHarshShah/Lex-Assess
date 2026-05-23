import { useRouterState } from '@tanstack/react-router'
import { ProfileSetupPage } from './ProfileSetupPage'

export function ProfilePage() {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  })

  if (!user) return null

  return <ProfileSetupPage user={user} mode="manage" />
}
