import * as React from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { deleteSavedTemplate, fetchSavedTemplates, type SavedTemplate } from '@/lib/email-campaigns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TemplatesTab() {
  const [items, setItems] = React.useState<SavedTemplate[] | null>(null);

  React.useEffect(() => {
    fetchSavedTemplates().then(setItems).catch(() => setItems([]));
  }, []);

  async function remove(t: SavedTemplate) {
    if (!confirm(`Delete template "${t.name}"? Campaigns already sent keep their content.`)) return;
    try {
      await deleteSavedTemplate(t.id);
      setItems((list) => (list ?? []).filter((x) => x.id !== t.id));
      toast.success('Template deleted');
    } catch {
      /* toast shown by api client */
    }
  }

  if (!items) return <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My templates</CardTitle>
        <p className="text-sm text-muted-foreground">Save one from the Content step of a new campaign.</p>
      </CardHeader>
      <CardContent className="divide-y rounded-md border p-0">
        {items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No saved templates yet.</p>}
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t.name}</p>
              <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => remove(t)}>Delete</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
