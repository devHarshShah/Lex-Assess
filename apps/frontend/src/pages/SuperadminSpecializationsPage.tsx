import * as React from 'react'
import { toast } from 'sonner'

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

  async function load() {
    try {
      setItems(await fetchSuperadminSpecializations())
    } catch {
      toast.error('Could not load specializations')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Specializations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add specialization" />
          <Button
            onClick={async () => {
              if (!newName.trim()) return
              try {
                await createSuperadminSpecialization(newName.trim())
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
            <div className="flex items-center gap-2">
              <Badge variant={item.isActive ? 'secondary' : 'outline'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
              <span>{item.name}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await updateSuperadminSpecialization(item.id, { isActive: !item.isActive })
                    await load()
                  } catch {
                    toast.error('Could not update')
                  }
                }}
              >
                {item.isActive ? 'Disable' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await deleteSuperadminSpecialization(item.id)
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
