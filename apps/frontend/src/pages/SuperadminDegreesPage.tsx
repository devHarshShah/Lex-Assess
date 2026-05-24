import * as React from 'react'
import { toast } from 'sonner'

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
            onClick={async () => {
              if (!newName.trim()) return
              try {
                await createSuperadminDegree(newName.trim())
                setNewName('')
                await load()
                toast.success('Added')
              } catch {
                toast.error('Could not add')
              }
            }}
          >
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
                onClick={async () => {
                  const name = window.prompt('Update degree name', item.name)
                  if (!name?.trim()) return
                  try {
                    await updateSuperadminDegree(item.id, name.trim())
                    await load()
                  } catch {
                    toast.error('Could not update')
                  }
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await deleteSuperadminDegree(item.id)
                    await load()
                  } catch {
                    toast.error('Could not delete')
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
