import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchPreferences, resubscribeEmail, unsubscribeEmail } from '@/lib/email-campaigns';

export function UnsubscribePage() {
  const token = React.useMemo(() => new URLSearchParams(window.location.search).get('token') ?? '', []);
  const [state, setState] = React.useState<{ email: string; unsubscribed: boolean } | null>(null);
  const [invalid, setInvalid] = React.useState(!token);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    fetchPreferences(token).then(setState).catch(() => setInvalid(true));
  }, [token]);

  async function toggle() {
    setBusy(true);
    try {
      setState(await (state?.unsubscribed ? resubscribeEmail(token) : unsubscribeEmail(token)));
    } catch {
      setInvalid(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">LexAssess</p>
        {invalid ? (
          <>
            <h1 className="text-2xl font-semibold">Link not valid</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or incomplete. Please use the link from your email.</p>
          </>
        ) : !state ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{state.unsubscribed ? 'You are unsubscribed' : 'Email preferences'}</h1>
            <p className="text-sm text-muted-foreground">
              {state.unsubscribed
                ? `${state.email} will no longer receive marketing emails from LexAssess. You will still get account and payment emails.`
                : `Stop marketing emails to ${state.email}? You will still get account and payment emails.`}
            </p>
            <Button onClick={toggle} disabled={busy} variant={state.unsubscribed ? 'outline' : 'default'}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {state.unsubscribed ? 'Resubscribe' : 'Unsubscribe'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
