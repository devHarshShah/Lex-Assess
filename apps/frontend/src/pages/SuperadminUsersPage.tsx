import * as React from 'react'
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'

import {
  assignAdminForSuperadmin,
  deleteUserForSuperadmin,
  fetchAllUsersForSuperadmin,
  type ManagedUser,
  updateUserForSuperadmin,
} from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function roleBadgeVariant(role: ManagedUser['role']): 'default' | 'secondary' | 'outline' {
  if (role === 'SUPERADMIN') return 'default'
  if (role === 'ADMIN') return 'secondary'
  return 'outline'
}

function UserRowActions({
  user,
  onEditName,
  onAssignAdmin,
  onDelete,
}: {
  user: ManagedUser
  onEditName: (user: ManagedUser) => void
  onAssignAdmin: (user: ManagedUser) => void
  onDelete: (user: ManagedUser) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open row actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditName(user)}>Edit Name</DropdownMenuItem>
        {user.role !== 'ADMIN' && user.role !== 'SUPERADMIN' ? (
          <DropdownMenuItem onClick={() => onAssignAdmin(user)}>Assign As Admin</DropdownMenuItem>
        ) : null}
        {user.role !== 'SUPERADMIN' ? <DropdownMenuItem onClick={() => onDelete(user)}>Delete User</DropdownMenuItem> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SuperadminUsersPage() {
  const [users, setUsers] = React.useState<ManagedUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [savingUserId, setSavingUserId] = React.useState<string | null>(null)
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null)
  const [draftName, setDraftName] = React.useState('')

  async function loadUsers() {
    setLoading(true)
    try {
      const records = await fetchAllUsersForSuperadmin()
      setUsers(records)
    } catch {
      toast.error('Could not load users')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadUsers()
  }, [])

  const filteredUsers = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return users
    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search)
      )
    })
  }, [users, query])

  const columns = React.useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          editingUserId === row.original.id ? (
            <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="h-8" />
          ) : (
            <span className="font-medium">{row.original.name}</span>
          )
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => <Badge variant={roleBadgeVariant(row.original.role)}>{row.original.role}</Badge>,
      },
      {
        accessorKey: 'authProvider',
        header: 'Provider',
        cell: ({ row }) => <Badge variant="outline">{row.original.authProvider}</Badge>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {editingUserId === row.original.id ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={savingUserId === row.original.id || draftName.trim().length < 2}
                  onClick={async () => {
                    setSavingUserId(row.original.id)
                    try {
                      const updated = await updateUserForSuperadmin(row.original.id, {
                        name: draftName.trim(),
                      })
                      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
                      setEditingUserId(null)
                      setDraftName('')
                      toast.success('Name updated')
                    } catch {
                      toast.error('Update failed')
                    } finally {
                      setSavingUserId(null)
                    }
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingUserId(null)
                    setDraftName('')
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : null}
            <UserRowActions
              user={row.original}
              onEditName={(user) => {
                setEditingUserId(user.id)
                setDraftName(user.name)
              }}
              onAssignAdmin={async (user) => {
                setSavingUserId(user.id)
                try {
                  await assignAdminForSuperadmin(user.email)
                  toast.success('User promoted to admin')
                  await loadUsers()
                } catch {
                  toast.error('Assign admin failed')
                } finally {
                  setSavingUserId(null)
                }
              }}
              onDelete={async (user) => {
                const ok = window.confirm(`Delete ${user.email}? This cannot be undone.`)
                if (!ok) return

                setSavingUserId(user.id)
                try {
                  await deleteUserForSuperadmin(user.id)
                  toast.success('User deleted')
                  setUsers((prev) => prev.filter((item) => item.id !== user.id))
                } catch {
                  toast.error('Delete failed')
                } finally {
                  setSavingUserId(null)
                }
              }}
            />
          </div>
        ),
      },
    ],
    [draftName, editingUserId, savingUserId],
  )

  const table = useReactTable({
    data: filteredUsers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 8, pageIndex: 0 },
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>All Users</CardTitle>
          <p className="text-sm text-muted-foreground">Superadmin controls for read, update, delete, and admin assignment.</p>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, role..."
          className="w-full md:max-w-sm"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-20 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
