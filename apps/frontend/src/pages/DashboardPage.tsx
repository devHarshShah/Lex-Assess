import { useRouterState } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getActiveRole, hasRole } from '@/lib/auth'

export function DashboardPage() {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  })

  if (!user) return null

  const role = getActiveRole(user)

  const cards = [
    { title: 'Role', value: role, show: true },
    { title: 'Superadmin Controls', value: 'Enabled', show: hasRole(role, ['SUPERADMIN']) },
    { title: 'Admin Controls', value: 'Enabled', show: hasRole(role, ['ADMIN']) },
    { title: 'Company Controls', value: 'Enabled', show: hasRole(role, ['COMPANY']) },
  ].filter((card) => card.show)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
