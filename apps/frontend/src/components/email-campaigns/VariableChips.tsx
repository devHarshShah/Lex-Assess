import { GripVertical } from 'lucide-react';
import type { EmailVariable } from '@/lib/email-campaigns';

const GROUPS: EmailVariable['group'][] = ['Student', 'Coupon', 'Links', 'Access'];

interface Props {
  variables: EmailVariable[];
  hasCoupon: boolean;
  onInsert: (token: string) => void;
}

// Chips can be dragged onto the subject, preview text or body, or clicked to insert at the cursor.
export function VariableChips({ variables, hasCoupon, onInsert }: Props) {
  return (
    <div className="space-y-3">
      {GROUPS.map((group) => {
        const items = variables.filter((v) => v.group === group);
        if (!items.length) return null;
        return (
          <div key={group}>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((v) => {
                const locked = !!v.requiresCoupon && !hasCoupon;
                const token = `{{${v.key}}}`;
                return (
                  <button
                    key={v.key}
                    type="button"
                    draggable={!locked}
                    disabled={locked}
                    title={locked ? 'Pick a coupon first' : `${v.description} (e.g. ${v.sample}). Drag into the text or click to insert.`}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', token);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => onInsert(token)}
                    className="inline-flex cursor-grab items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium shadow-sm transition hover:border-primary hover:text-primary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
