import { useRouterState } from '@tanstack/react-router'
import { CompanyProfileSetupPage } from './CompanyProfileSetupPage'
import { type AuthUser } from '@/lib/auth'

export function CompanyProfilePage() {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  }) as unknown as AuthUser

  if (!user) return null

  return <CompanyProfileSetupPage user={user} mode="manage" />
}
