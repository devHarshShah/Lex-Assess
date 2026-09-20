import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import {
  fetchSuperadminProfiles,
  getActiveRole,
  getStoredUser,
  setCvScoreForSuperadmin,
  verifySuperadminProfile,
  type ManagedUserProfileRecord,
} from '@/lib/auth'
import { DocumentPreviewDialog } from '@/components/document-preview-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'

export function SuperadminProfileVerificationsPage() {
  const [rows, setRows] = React.useState<ManagedUserProfileRecord[]>([])
  const [cvScoreInputs, setCvScoreInputs] = React.useState<Record<string, string>>({})
  const [preview, setPreview] = React.useState<{ title: string; url: string } | null>(null)
  const [savingCvScoreId, setSavingCvScoreId] = React.useState<string | null>(null)
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null)
  const storedUser = getStoredUser()
  const canVerify = storedUser ? getActiveRole(storedUser) === 'SUPERADMIN' : false

  async function load() {
    try {
      const profiles = await fetchSuperadminProfiles()
      setRows(profiles)
      setCvScoreInputs(
        Object.fromEntries(profiles.map((row) => [row.id, row.profile?.cvScore?.toString() ?? ''])),
      )
    } catch {
      toast.error('Could not load profiles')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  async function handleSaveCvScore(userId: string) {
    const raw = cvScoreInputs[userId]
    const score = Number(raw)
    if (raw === '' || Number.isNaN(score) || score < 0 || score > 100) {
      toast.error('CV score must be a number between 0 and 100')
      return
    }
    setSavingCvScoreId(userId)
    try {
      await setCvScoreForSuperadmin(userId, score)
      await load()
      toast.success('CV score saved')
    } catch {
      toast.error('Could not save CV score')
    } finally {
      setSavingCvScoreId(null)
    }
  }

  const columns = React.useMemo<ColumnDef<ManagedUserProfileRecord>[]>(() => {
    const base: ColumnDef<ManagedUserProfileRecord>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader label="Name" column={column} />,
        cell: ({ row }) => {
          const profile = row.original.profile
          return (
            <div className="min-w-40 max-w-64">
              <div className="font-medium truncate">{row.original.name}</div>
              <div className="text-xs text-muted-foreground truncate">{row.original.email}</div>
              {profile?.rollNumber && (
                <div className="text-xs text-muted-foreground">{profile.rollNumber}</div>
              )}
            </div>
          )
        },
      },
      {
        id: 'education',
        header: 'Education',
        cell: ({ row }) => {
          const profile = row.original.profile
          return (
            <div className="min-w-40 max-w-64">
              <div className="truncate">{profile?.college || '-'}</div>
              <div className="text-xs text-muted-foreground truncate">
                {profile?.degree || '-'}
                {profile?.internshipGoal ? ` · ${profile.internshipGoal}` : ''}
              </div>
            </div>
          )
        },
      },
      {
        id: 'documents',
        header: 'Documents',
        cell: ({ row }) => {
          const profile = row.original.profile
          return (
            <div className="flex flex-col items-start gap-1 text-sm">
              {profile?.verificationDocUrl ? (
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    setPreview({ title: `Verification Doc — ${row.original.name}`, url: profile.verificationDocUrl! })
                  }
                >
                  Verification Doc
                </button>
              ) : (
                <span className="text-muted-foreground">No verification doc</span>
              )}
              {profile?.resumeUrl ? (
                <button
                  type="button"
                  className="underline"
                  onClick={() => setPreview({ title: `CV — ${row.original.name}`, url: profile.resumeUrl! })}
                >
                  CV
                </button>
              ) : (
                <span className="text-muted-foreground">No CV</span>
              )}
            </div>
          )
        },
      },
      {
        id: 'cvScore',
        header: ({ column }) => <SortableHeader label="CV Score" column={column} />,
        accessorFn: (row) => row.profile?.cvScore ?? -1,
        cell: ({ row }) => {
          const userId = row.original.id
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                className="w-16 h-8"
                value={cvScoreInputs[userId] ?? ''}
                onChange={(e) => setCvScoreInputs((prev) => ({ ...prev, [userId]: e.target.value }))}
              />
              <Button size="sm" variant="outline" disabled={savingCvScoreId === userId} onClick={() => handleSaveCvScore(userId)}>
                {savingCvScoreId === userId && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save
              </Button>
            </div>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.profile?.isComplete ? 'secondary' : 'outline'}>
            {row.original.profile?.isComplete ? 'Verified' : 'Pending'}
          </Badge>
        ),
      },
    ]

    if (canVerify) {
      base.push({
        id: 'action',
        header: 'Action',
        cell: ({ row }) => {
          const profile = row.original.profile
          return (
            <Button
              size="sm"
              variant="outline"
              disabled={verifyingId === row.original.id}
              onClick={async () => {
                setVerifyingId(row.original.id)
                try {
                  await verifySuperadminProfile(row.original.id, !(profile?.isComplete ?? false))
                  await load()
                  toast.success('Verification updated')
                } catch {
                  toast.error('Could not update verification')
                } finally {
                  setVerifyingId(null)
                }
              }}
            >
              {verifyingId === row.original.id && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {profile?.isComplete ? 'Mark Pending' : 'Mark Verified'}
            </Button>
          )
        },
      })
    }

    return base
  }, [cvScoreInputs, canVerify, savingCvScoreId, verifyingId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile Verification</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={rows} searchKey="name" searchPlaceholder="Search by name..." />
      </CardContent>

      <DocumentPreviewDialog
        title={preview?.title ?? ''}
        url={preview?.url ?? null}
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      />
    </Card>
  )
}
