import { ChevronsUpDown } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import type { Role } from '@/lib/auth'

const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  COMPANY: 'Company',
  USER: 'User',
  INTERVIEWER: 'Interviewer',
}

function formatRole(role: Role) {
  return ROLE_LABELS[role] ?? role
}

export function TeamSwitcher({
  appName,
  roles,
  activeRole,
  onRoleChange,
}: {
  appName: string
  roles: Role[]
  activeRole: Role
  onRoleChange: (role: Role) => void
}) {
  const { isMobile } = useSidebar()
  const isSingleRole = roles.length <= 1

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isSingleRole ? (
          <SidebarMenuButton size="lg" className="cursor-default">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
              <img src="/logo.png" alt="" className="size-6 object-contain" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{appName}</span>
            </div>
          </SidebarMenuButton>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
                  <img src="/logo.png" alt="" className="size-6 object-contain" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{appName}</span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Role</DropdownMenuLabel>
              {roles.map((role) => (
                <DropdownMenuItem key={role} onClick={() => onRoleChange(role)} className="gap-2 p-2">
                  {formatRole(role)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
