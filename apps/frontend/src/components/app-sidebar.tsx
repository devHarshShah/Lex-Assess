import * as React from 'react'
import { BookOpen, Bot, Frame, Map, PieChart, Settings2, SquareTerminal } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'

import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'

const data = {
  teams: [
    {
      name: 'Lex Assess',
      logo: Frame,
      plan: 'Enterprise',
    },
  ],
  navMain: [
    {
      title: 'Playground',
      url: '#',
      icon: SquareTerminal,
      isActive: true,
      items: [{ title: 'Overview', url: '#' }],
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

  if (!user) return null

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email, role: user.role }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
