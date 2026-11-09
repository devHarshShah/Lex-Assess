import * as React from 'react'
import { toast } from 'sonner'
import { Copy, Loader2 } from 'lucide-react'

import { createApiToken, fetchApiTokens, revokeApiToken, type ApiToken, type CreatedApiToken } from '@/lib/api-tokens'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-IN') : null
}

function tokenStatus(t: ApiToken): { label: string; live: boolean } {
  if (t.revokedAt) return { label: `revoked ${formatDate(t.revokedAt)}`, live: false }
  if (t.expiresAt && new Date(t.expiresAt).getTime() <= Date.now()) return { label: 'expired', live: false }
  return { label: t.expiresAt ? `expires ${formatDate(t.expiresAt)}` : 'no expiry', live: true }
}

async function copy(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${what} copied`)
  } catch {
    toast.error('Could not copy; select the text and copy it manually')
  }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium">{label}</p>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 break-all rounded-md border bg-muted px-2 py-1.5 font-mono text-xs">{value}</code>
        <Button size="sm" variant="outline" onClick={() => copy(value, label)} aria-label={`Copy ${label}`}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function SuperadminApiTokensPage() {
  const [items, setItems] = React.useState<ApiToken[]>([])
  const [name, setName] = React.useState('')
  const [ownerEmail, setOwnerEmail] = React.useState('')
  const [expiresInDays, setExpiresInDays] = React.useState('90')
  const [isAdding, setIsAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [created, setCreated] = React.useState<CreatedApiToken | null>(null)

  async function load() {
    try {
      setItems(await fetchApiTokens())
    } catch {
      toast.error('Could not load API tokens')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  async function handleAdd() {
    if (name.trim().length < 2) {
      toast.error('Give the token a name, e.g. "Priya - paper uploads"')
      return
    }
    setIsAdding(true)
    try {
      const result = await createApiToken({
        name: name.trim(),
        ownerEmail: ownerEmail.trim() || undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      })
      setCreated(result)
      setName('')
      setOwnerEmail('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create token')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRevoke(t: ApiToken) {
    if (!window.confirm(`Revoke "${t.name}"? Claude connectors using it stop working immediately.`)) return
    setBusyId(t.id)
    try {
      await revokeApiToken(t.id)
      await load()
      toast.success('Token revoked')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revoke token')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>API Tokens</CardTitle>
          <p className="text-sm text-muted-foreground">
            A token lets an admin connect LexAssess to their own Claude and create question papers from a PDF. Claude can only
            create and edit <strong>drafts</strong>: every paper still has to be reviewed (especially the answer key) and published
            from the paper builder. Anyone with the token can create drafts, so share it only with the admin it is for.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Priya - papers" maxLength={80} aria-label="Token name" />
            <Input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="Admin email (empty = you)"
              aria-label="Admin the token acts as"
            />
            <Input
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder="Expires in days (empty = never)"
              aria-label="Expires in days"
            />
            <Button disabled={isAdding} onClick={handleAdd}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate token
            </Button>
          </div>

          {created && (
            <div className="space-y-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
              <p className="text-sm font-medium">
                Copy these now. The token is shown only once; if it is lost, revoke it and generate a new one.
              </p>
              <CopyRow label="Claude.ai connector URL" value={created.connectorUrl} />
              <CopyRow label="Token (for Claude Desktop / Claude Code header)" value={created.token} />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>Claude.ai:</strong> Settings → Connectors → Add custom connector → name it &quot;LexAssess&quot; and paste the connector
                  URL.
                </p>
                <p>
                  Then attach the paper PDF and ask: &ldquo;Using LexAssess, create a draft of this paper under &lt;category&gt;.&rdquo; Claude replies
                  with a link to the draft in the paper builder.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCreated(null)}>
                I&apos;ve copied it
              </Button>
            </div>
          )}

          <div className="divide-y rounded-md border">
            {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No API tokens yet.</p>}
            {items.map((t) => {
              const status = tokenStatus(t)
              return (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {t.name} <span className="font-mono text-xs font-normal text-muted-foreground">{t.prefix}…</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.user.name ?? t.user.email} ({t.user.email}) · {status.label} · created {formatDate(t.createdAt)} ·{' '}
                      {t.lastUsedAt ? `last used ${new Date(t.lastUsedAt).toLocaleString('en-IN')}` : 'never used'}
                    </p>
                  </div>
                  {status.live && (
                    <Button size="sm" variant="destructive" disabled={busyId === t.id} onClick={() => handleRevoke(t)}>
                      {busyId === t.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Revoke
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
