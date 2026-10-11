import React from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { reassignInterview, type Interview, type Interviewer } from '@/lib/interview';

type Mode = 'same-time' | 'open-slot';

interface ReassignInterviewDialogProps {
  interview: Interview | null;
  interviewers: Interviewer[];
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function ReassignInterviewDialog({ interview, interviewers, onOpenChange, onDone }: ReassignInterviewDialogProps) {
  const [newInterviewerId, setNewInterviewerId] = React.useState('');
  const [mode, setMode] = React.useState<Mode>('same-time');
  const [slotId, setSlotId] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setNewInterviewerId('');
    setMode('same-time');
    setSlotId('');
  }, [interview?.id]);

  const specialization = interview?.student?.profile?.specialization;
  const matchesSpecialization = (i: Interviewer) =>
    !!specialization && !!i.interviewerProfile?.specializations.some((s) => s.name === specialization);

  // Interviewers covering the student's practice area first
  const candidates = interviewers
    .filter((i) => i.id !== interview?.interviewerId)
    .sort((a, b) => Number(matchesSpecialization(b)) - Number(matchesSpecialization(a)));

  const openSlots = (interviewers.find((i) => i.id === newInterviewerId)?.interviewSlots ?? [])
    .filter((s) => !s.isBooked && new Date(s.startTime) > new Date());

  const handleSubmit = async () => {
    if (!interview || !newInterviewerId) return;
    if (mode === 'open-slot' && !slotId) {
      toast.error('Please pick one of their open slots');
      return;
    }
    setSubmitting(true);
    try {
      await reassignInterview(interview.id, { newInterviewerId, ...(mode === 'open-slot' ? { slotId } : {}) });
      toast.success('Interview reassigned. The student and new interviewer have been notified.');
      onOpenChange(false);
      onDone();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reassign interview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!interview} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Interview</DialogTitle>
          {interview && (
            <DialogDescription>
              {interview.student?.name} with {interview.interviewer?.name} on{' '}
              {format(new Date(interview.slot.startTime), 'MMM d, h:mm a')}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>New Interviewer</Label>
            <Select value={newInterviewerId} onValueChange={(v: string) => { setNewInterviewerId(v); setSlotId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select interviewer" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}{matchesSpecialization(i) ? ` · ${specialization}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="w-full">
                <TabsTrigger value="same-time" className="flex-1">Keep same time</TabsTrigger>
                <TabsTrigger value="open-slot" className="flex-1">Use their open slot</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === 'same-time' ? (
              <p className="text-xs text-muted-foreground">
                The interview stays at the same time and keeps its Meet link. This fails if the new interviewer already has an interview booked then.
              </p>
            ) : !newInterviewerId ? (
              <p className="text-xs text-muted-foreground italic">Select an interviewer to see their open slots.</p>
            ) : openSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">This interviewer has no open future slots.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                {openSlots.map((s) => (
                  <Button
                    key={s.id}
                    type="button"
                    size="sm"
                    variant={slotId === s.id ? 'default' : 'outline'}
                    className="text-xs"
                    onClick={() => setSlotId(s.id)}
                  >
                    {format(new Date(s.startTime), 'MMM d, h:mm a')}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {specialization && newInterviewerId && !matchesSpecialization(candidates.find((i) => i.id === newInterviewerId)!) && (
            <Badge variant="secondary" className="text-[10px]">Doesn't list {specialization} as a specialization</Badge>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || !newInterviewerId}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
