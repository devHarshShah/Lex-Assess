import * as React from 'react'
import { BookOpen, FileText, GraduationCap, ShieldCheck, ShieldUser, SquareTerminal, University, UserCheck, UserCircle2 } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'

import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'
import { getActiveRole, getAvailableRoles, setActiveRole } from '@/lib/auth'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useRouterState({
    select: (state) => state.matches.find((match) => match.routeId === '/dashboard')?.context.user,
  })

  const [, forceRerender] = React.useState(0)

  if (!user) return null

  const availableRoles = getAvailableRoles(user)
  const activeRole = getActiveRole(user)
  let navMainItems: React.ComponentProps<typeof NavMain>['items'] = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: SquareTerminal,
      isActive: true,
      items: [{ title: 'Overview', url: '/dashboard' }],
    },
  ]

  if (activeRole === 'SUPERADMIN') {
    navMainItems.push(
      {
        title: 'User Admin',
        url: '/dashboard/users',
        icon: ShieldUser,
        items: [{ title: 'Manage Users', url: '/dashboard/users' }],
      },
      {
        title: 'Profile Review',
        url: '/dashboard/profile-verifications',
        icon: UserCheck,
        items: [{ title: 'Verify Profiles', url: '/dashboard/profile-verifications' }],
      },
      {
        title: 'Profile Options',
        url: '/dashboard/specializations',
        icon: ShieldCheck,
        items: [
          { title: 'Specializations', url: '/dashboard/specializations' },
          { title: 'Colleges', url: '/dashboard/colleges' },
          { title: 'Degrees', url: '/dashboard/degrees' },
        ],
      },
      {
        title: 'Assessments',
        url: '/dashboard/all-papers',
        icon: FileText,
        items: [
          { title: 'All Question Papers', url: '/dashboard/all-papers' },
        ],
      }
    )
  } else if (activeRole === 'ADMIN') {
    navMainItems.push(
      {
        title: 'Assessments',
        url: '/dashboard/specializations',
        icon: ShieldCheck,
        items: [
          { title: 'Question Papers', url: '/dashboard/specializations' },
        ],
      },
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: UserCircle2,
        items: [{ title: 'My Profile', url: '/dashboard/profile' }],
      }
    )
  } else {
    navMainItems.push(
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: UserCircle2,
        items: [{ title: 'My Profile', url: '/dashboard/profile' }],
      },
      {
        title: 'Knowledge',
        url: '#',
        icon: BookOpen,
        items: [{ title: 'Guides', url: '#' }],
      }
    )
  }

  const projectItems =
    activeRole === 'SUPERADMIN'
      ? [
          { name: 'Colleges', url: '/dashboard/colleges', icon: University },
          { name: 'Degrees', url: '/dashboard/degrees', icon: GraduationCap },
        ]
      : []

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
        {projectItems.length > 0 ? <NavProjects projects={projectItems} /> : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
