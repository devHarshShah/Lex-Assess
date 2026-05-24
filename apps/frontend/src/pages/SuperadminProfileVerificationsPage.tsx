import * as React from 'react'
import { toast } from 'sonner'

import { fetchSuperadminProfiles, verifySuperadminProfile, type ManagedUserProfileRecord } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function SuperadminProfileVerificationsPage() {
  const [rows, setRows] = React.useState<ManagedUserProfileRecord[]>([])

  async function load() {
    try {
      setRows(await fetchSuperadminProfiles())
    } catch {
      toast.error('Could not load profiles')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile Verification</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Degree</TableHead>
              <TableHead>Verification Doc</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.profile?.college || '-'}</TableCell>
                <TableCell>{row.profile?.degree || '-'}</TableCell>
                <TableCell>
                  {row.profile?.verificationDocUrl ? (
                    <a href={row.profile.verificationDocUrl} className="underline" target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={row.profile?.isComplete ? 'secondary' : 'outline'}>{row.profile?.isComplete ? 'Verified' : 'Pending'}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await verifySuperadminProfile(row.id, !(row.profile?.isComplete ?? false))
                        await load()
                        toast.success('Verification updated')
                      } catch {
                        toast.error('Could not update verification')
                      }
                    }}
                  >
                    {row.profile?.isComplete ? 'Mark Pending' : 'Mark Verified'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
