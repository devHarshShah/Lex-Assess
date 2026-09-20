import * as React from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import {
  createSuperadminDegree,
  deleteSuperadminDegree,
  fetchSuperadminDegrees,
  updateSuperadminDegree,
} from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function SuperadminDegreesPage() {
  const [items, setItems] = React.useState<{ id: string; name: string }[]>([])
  const [newName, setNewName] = React.useState('')
  const [isAdding, setIsAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  async function load() {
    try {
      setItems(await fetchSuperadminDegrees())
    } catch {
      toast.error('Could not load degrees')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Degrees</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add degree" />
          <Button
            disabled={isAdding}
            onClick={async () => {
              if (!newName.trim()) return
              setIsAdding(true)
              try {
                await createSuperadminDegree(newName.trim())
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
            <span>{item.name}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === item.id}
                onClick={async () => {
                  const name = window.prompt('Update degree name', item.name)
                  if (!name?.trim()) return
                  setBusyId(item.id)
                  try {
                    await updateSuperadminDegree(item.id, name.trim())
                    await load()
                  } catch {
                    toast.error('Could not update')
                  } finally {
                    setBusyId(null)
                  }
                }}
              >
                {busyId === item.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === item.id}
                onClick={async () => {
                  setBusyId(item.id)
                  try {
                    await deleteSuperadminDegree(item.id)
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
