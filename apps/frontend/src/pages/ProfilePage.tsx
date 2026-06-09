import { useRouterState } from '@tanstack/react-router'
import { ProfileSetupPage } from './ProfileSetupPage'
import { type AuthUser } from '@/lib/auth'

export function ProfilePage() {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  }) as unknown as AuthUser

  if (!user) return null

  return <ProfileSetupPage user={user} mode="manage" />
}
