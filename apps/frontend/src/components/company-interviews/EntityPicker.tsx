import * as React from 'react'
import { Loader2, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface PickerOption {
  id: string
  title: string
  subtitle: string
}

// Search-as-you-type picker backed by a server search.
export function EntityPicker({
  label,
  placeholder,
  value,
  onChange,
  search,
  initialQuery,
}: {
  label: string
  placeholder: string
  value: PickerOption | null
  onChange: (o: PickerOption | null) => void
  search: (q: string) => Promise<PickerOption[]>
  // Pre-fill (e.g. from the CRM): searches this and selects an exact single match
  initialQuery?: string
}) {
  const [query, setQuery] = React.useState(initialQuery ?? '')
  const [options, setOptions] = React.useState<PickerOption[]>([])
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const autoPicked = React.useRef(!initialQuery)

  React.useEffect(() => {
    if (value) return
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      search(query)
        .then((o) => {
          if (cancelled) return
          setOptions(o)
          if (!autoPicked.current) {
            autoPicked.current = true
            if (o.length === 1) onChange(o[0]!)
          }
        })
        .catch(() => undefined)
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, value])

  if (value) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{value.title}</p>
            <p className="truncate text-xs text-muted-foreground">{value.subtitle}</p>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => onChange(null)} aria-label={`Change ${label.toLowerCase()}`}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="relative">
        <Input
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {options.length === 0 && !loading && <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>}
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                }}
              >
                <span className="block truncate text-sm">{o.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{o.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
