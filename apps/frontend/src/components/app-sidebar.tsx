import * as React from 'react'
import { BookOpen, Bot, Map, PieChart, Settings2, ShieldUser, SquareTerminal } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'

import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'
import { getActiveRole, getAvailableRoles, setActiveRole } from '@/lib/auth'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: SquareTerminal,
      isActive: true,
      items: [{ title: 'Overview', url: '/dashboard' }],
    },
    {
      title: 'Superadmin',
      url: '/dashboard/users',
      icon: ShieldUser,
      items: [{ title: 'User Management', url: '/dashboard/users' }],
    },
    {
      title: 'Models',
      url: '#',
      icon: Bot,
      items: [{ title: 'Catalog', url: '#' }],
    },
    {
      title: 'Documentation',
      url: '#',
      icon: BookOpen,
      items: [{ title: 'Guides', url: '#' }],
    },
    {
      title: 'Settings',
      url: '#',
      icon: Settings2,
      items: [{ title: 'General', url: '#' }],
    },
  ],
  projects: [
    {
      name: 'Assessments',
      url: '#',
      icon: PieChart,
    },
    {
      name: 'Companies',
      url: '#',
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  })

  const [, forceRerender] = React.useState(0)

  if (!user) return null

  const availableRoles = getAvailableRoles(user)
  const activeRole = getActiveRole(user)
  const navMainItems =
    activeRole === 'SUPERADMIN' ? data.navMain : data.navMain.filter((item) => item.title !== 'Superadmin')

  function onRoleChange(role: (typeof availableRoles)[number]) {
    setActiveRole(role)
    forceRerender((v) => v + 1)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher appName="LexAssess" roles={availableRoles} activeRole={activeRole} onRoleChange={onRoleChange} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
