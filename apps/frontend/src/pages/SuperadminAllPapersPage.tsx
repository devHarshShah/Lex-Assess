import * as React from 'react'
import { flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

import { fetchAllPapers } from '@/lib/question-papers'
import type { QuestionPaperWithMeta } from '@/lib/question-papers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'PUBLISHED') return 'default'
  if (status === 'ARCHIVED') return 'secondary'
  return 'outline'
}

function activeVersion(paper: QuestionPaperWithMeta) {
  return (
    paper.versions.find((v) => v.status === 'PUBLISHED') ??
    paper.versions.find((v) => v.status === 'DRAFT') ??
    paper.versions[0] ??
    null
  )
}

export function SuperadminAllPapersPage() {
  const [papers, setPapers] = React.useState<QuestionPaperWithMeta[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')

  async function loadPapers() {
    setLoading(true)
    try {
      const data = await fetchAllPapers()
      setPapers(data)
    } catch {
      toast.error('Could not load papers')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void loadPapers()
  }, [])

  const filteredPapers = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return papers
    return papers.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.specialization.name.toLowerCase().includes(search) ||
        (p.createdBy?.name ?? '').toLowerCase().includes(search) ||
        (p.createdBy?.email ?? '').toLowerCase().includes(search),
    )
  }, [papers, query])

  const columns = React.useMemo<ColumnDef<QuestionPaperWithMeta>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        id: 'specialization',
        header: 'Specialization',
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.specialization.name}</Badge>
        ),
      },
      {
        id: 'author',
        header: 'Author',
        cell: ({ row }) =>
          row.original.createdBy ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{row.original.createdBy.name}</span>
              <span className="text-xs text-muted-foreground">{row.original.createdBy.email}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        id: 'versions',
        header: 'Versions',
        cell: ({ row }) => {
          const total = row.original.versions.length
          const questions = row.original.versions.reduce((s, v) => s + v._count.questions, 0)
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{total} version{total !== 1 ? 's' : ''}</span>
              <span className="text-xs text-muted-foreground">{questions} question{questions !== 1 ? 's' : ''}</span>
            </div>
          )
        },
      },
      {
        id: 'status',
        header: 'Active Status',
        cell: ({ row }) => {
          const v = activeVersion(row.original)
          if (!v) return <span className="text-muted-foreground text-sm">—</span>
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
              <span className="text-xs text-muted-foreground">{v.versionName}</span>
            </div>
          )
        },
      },
      {
        id: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const v = activeVersion(row.original)
          if (!v) return null
          return (
            <Link to="/dashboard/papers/$versionId/builder" params={{ versionId: v.id }}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ExternalLink size={14} />
                Open
              </Button>
            </Link>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: filteredPapers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10, pageIndex: 0 },
    },
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>All Question Papers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Overview of every paper created across all specializations and admins.
            </p>
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, specialization, author..."
            className="w-full md:max-w-sm"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading papers...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
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
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-20 text-center">
                        No question papers found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
