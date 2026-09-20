import * as React from 'react'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import {
  createSuperadminSpecialization,
  deleteSuperadminSpecialization,
  fetchSuperadminSpecializations,
  updateSuperadminSpecialization,
} from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function SuperadminSpecializationsPage() {
  const [items, setItems] = React.useState<{ id: string; name: string; isActive: boolean }[]>([])
  const [newName, setNewName] = React.useState('')
  const [isAdding, setIsAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  async function load() {
    try {
      setItems(await fetchSuperadminSpecializations())
    } catch {
      toast.error('Could not load practice areas')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Practice Areas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add practice area" />
          <Button
            disabled={isAdding}
            onClick={async () => {
              if (!newName.trim()) return
              setIsAdding(true)
              try {
                await createSuperadminSpecialization(newName.trim())
                setNewName('')
                await load()
                toast.success('Added')
              } catch {
                toast.error('Could not add')
              } finally {
                setIsAdding(false)
              }
            }}
          >
            {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add
          </Button>
        </div>
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              <Badge variant={item.isActive ? 'secondary' : 'outline'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
              <span>{item.name}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === item.id}
                onClick={async () => {
                  setBusyId(item.id)
                  try {
                    await updateSuperadminSpecialization(item.id, { isActive: !item.isActive })
                    await load()
                  } catch {
                    toast.error('Could not update')
                  } finally {
                    setBusyId(null)
                  }
                }}
              >
                {busyId === item.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {item.isActive ? 'Disable' : 'Enable'}
              </Button>
              <Link to="/dashboard/specializations/$specializationId/papers" params={{ specializationId: item.id }}>
                <Button size="sm" variant="outline">
                  Manage Papers
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === item.id}
                onClick={async () => {
                  setBusyId(item.id)
                  try {
                    await deleteSuperadminSpecialization(item.id)
                    await load()
                  } catch {
                    toast.error('Could not delete')
                  } finally {
                    setBusyId(null)
                  }
                }}
              >
                {busyId === item.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
