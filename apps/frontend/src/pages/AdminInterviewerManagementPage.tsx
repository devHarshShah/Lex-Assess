import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { fetchInterviewers, createInterviewer, deleteInterviewer, resendInterviewerWelcome, createSlot, deleteSlot, adminBulkAddSlots, fetchScheduledInterviews, type Interviewer, type Interview } from '@/lib/interview';
import { ReassignInterviewDialog } from '@/components/ReassignInterviewDialog';
import { fetchProfileOptions } from '@/lib/auth';
import { UserPlus, Calendar, Loader2, ChevronDown, Trash2, Clock, Repeat, Mail, ArrowRightLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { format } from 'date-fns';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';

export function AdminInterviewerManagementPage() {
  const [interviewers, setInterviewers] = React.useState<Interviewer[]>([]);
  const [specializationOptions, setSpecializationOptions] = React.useState<string[]>([]);
  const [selectedSpecs, setSelectedSpecs] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddInterviewerOpen, setIsAddInterviewerOpen] = React.useState(false);
  const [isAddSlotOpen, setIsAddSlotOpen] = React.useState(false);
  const [isBulkSlotOpen, setIsBulkSlotOpen] = React.useState(false);
  const [selectedInterviewer, setSelectedInterviewer] = React.useState<Interviewer | null>(null);
  const [selectedDays, setSelectedDays] = React.useState<number[]>([]);
  const [isAddingInterviewer, setIsAddingInterviewer] = React.useState(false);
  const [isAddingSlot, setIsAddingSlot] = React.useState(false);
  const [isBulkAddingSlot, setIsBulkAddingSlot] = React.useState(false);
  const [deletingInterviewerId, setDeletingInterviewerId] = React.useState<string | null>(null);
  const [deletingSlotId, setDeletingSlotId] = React.useState<string | null>(null);
  const [resendingInterviewerId, setResendingInterviewerId] = React.useState<string | null>(null);
  const [scheduledInterviews, setScheduledInterviews] = React.useState<Interview[]>([]);
  const [reassigning, setReassigning] = React.useState<Interview | null>(null);

  const days = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
  ];

  React.useEffect(() => {
    Promise.all([loadInterviewers(), loadOptions(), loadScheduledInterviews()]);
  }, []);

  const loadInterviewers = async () => {
    try {
      const data = await fetchInterviewers();
      setInterviewers(data);
    } catch (error) {
      toast.error('Failed to load interviewers');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledInterviews = async () => {
    try {
      setScheduledInterviews(await fetchScheduledInterviews());
    } catch (error) {
      toast.error('Failed to load upcoming interviews');
    }
  };

  const loadOptions = async () => {
    try {
      const options = await fetchProfileOptions();
      setSpecializationOptions(options.specializations);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleAddInterviewer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedSpecs.length === 0) {
      toast.error('Please select at least one specialization');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      specializations: selectedSpecs,
      bio: formData.get('bio') as string,
    };

    setIsAddingInterviewer(true);
    try {
      await createInterviewer(data);
      toast.success('Interviewer added successfully');
      setIsAddInterviewerOpen(false);
      setSelectedSpecs([]);
      loadInterviewers();
    } catch (error) {
      toast.error('Failed to add interviewer');
    } finally {
      setIsAddingInterviewer(false);
    }
  };

  const handleDeleteInterviewer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interviewer? This will also delete all their slots.')) return;
    setDeletingInterviewerId(id);
    try {
      await deleteInterviewer(id);
      toast.success('Interviewer deleted successfully');
      loadInterviewers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete interviewer');
    } finally {
      setDeletingInterviewerId(null);
    }
  };

  const handleResendWelcome = async (id: string) => {
    setResendingInterviewerId(id);
    try {
      await resendInterviewerWelcome(id);
      toast.success('Welcome email resent');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend welcome email');
    } finally {
      setResendingInterviewerId(null);
    }
  };

  const handleAddSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInterviewer) return;
    const formData = new FormData(e.currentTarget)
    // <input type="datetime-local"> gives a naive "YYYY-MM-DDTHH:mm" string with
    // no timezone info. Interviewers/admins enter this as India wall-clock time
    // (this product is India-only), so anchor it explicitly to +05:30 before
    // sending - otherwise the backend's Date parsing anchors it to whatever
    // timezone the server process happens to run in (UTC on Cloud Run),
    // silently shifting every slot by 5.5 hours.
    const toIstIso = (localDateTime: string) => `${localDateTime}:00+05:30`
    const data = {
      interviewerId: selectedInterviewer.id,
      startTime: toIstIso(formData.get('startTime') as string),
      endTime: toIstIso(formData.get('endTime') as string),
    };

    setIsAddingSlot(true);
    try {
      await createSlot(data);
      toast.success('Slot added successfully');
      setIsAddSlotOpen(false);
      loadInterviewers();
    } catch (error) {
      toast.error('Failed to add slot');
    } finally {
      setIsAddingSlot(false);
    }
  };

  const handleBulkAddSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInterviewer) return;
    if (selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      daysOfWeek: selectedDays,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      durationMinutes: parseInt(formData.get('durationMinutes') as string || '30'),
      breakMinutes: parseInt(formData.get('breakMinutes') as string || '0'),
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
    };

    setIsBulkAddingSlot(true);
    try {
      const res = await adminBulkAddSlots(selectedInterviewer.id, data);
      toast.success(`${res.count} slots added successfully`);
      setIsBulkSlotOpen(false);
      setSelectedDays([]);
      loadInterviewers();
    } catch (error) {
      toast.error('Failed to generate slots');
    } finally {
      setIsBulkAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    setDeletingSlotId(slotId);
    try {
      await deleteSlot(slotId);
      toast.success('Slot deleted');
      loadInterviewers();
    } catch (error) {
      toast.error('Failed to delete slot');
    } finally {
      setDeletingSlotId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Interviewers</h2>
          <p className="text-muted-foreground">Manage interviewers and their availability.</p>
        </div>
        <Dialog open={isAddInterviewerOpen} onOpenChange={(open) => {
          setIsAddInterviewerOpen(open);
          if (!open) setSelectedSpecs([]);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <UserPlus className="h-4 w-4 mr-2" /> Add Interviewer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Interviewer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddInterviewer} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label>Specializations (Practice Areas)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      {selectedSpecs.length > 0 
                        ? `${selectedSpecs.length} selected` 
                        : "Select areas..."}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[300px]">
                    {specializationOptions.map((spec) => (
                      <DropdownMenuCheckboxItem
                        key={spec}
                        checked={selectedSpecs.includes(spec)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSpecs([...selectedSpecs, spec]);
                          } else {
                            setSelectedSpecs(selectedSpecs.filter(s => s !== spec));
                          }
                        }}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {spec}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {selectedSpecs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedSpecs.map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px] px-1 py-0 h-5">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" name="bio" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isAddingInterviewer}>
                  {isAddingInterviewer && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Interviewer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
          <CardDescription>Reassign a booked interview if its interviewer becomes unavailable.</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledInterviews.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No upcoming interviews booked.</p>
          ) : (
            <div className="divide-y max-h-[320px] overflow-y-auto">
              {scheduledInterviews.map((interview) => (
                <div key={interview.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {interview.student?.name}
                      {interview.student?.profile?.specialization && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">{interview.student.profile.specialization}</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(interview.slot.startTime), 'MMM d, h:mm a')} · with {interview.interviewer?.name}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setReassigning(interview)}>
                    <ArrowRightLeft className="h-4 w-4 mr-2" /> Reassign
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReassignInterviewDialog
        interview={reassigning}
        interviewers={interviewers}
        onOpenChange={(open) => { if (!open) setReassigning(null); }}
        onDone={() => { loadInterviewers(); loadScheduledInterviews(); }}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {interviewers.map((interviewer) => (
          <Card key={interviewer.id}>
            <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg">{interviewer.name}</CardTitle>
                <CardDescription>{interviewer.email}</CardDescription>
              </div>
              <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="Resend welcome email"
                onClick={() => handleResendWelcome(interviewer.id)}
                disabled={resendingInterviewerId === interviewer.id}
              >
                {resendingInterviewerId === interviewer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteInterviewer(interviewer.id)}
                disabled={deletingInterviewerId === interviewer.id}
              >
                {deletingInterviewerId === interviewer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {interviewer.interviewerProfile?.specializations.map((spec) => (
                  <Badge key={spec.id} variant="secondary">{spec.name}</Badge>
                ))}
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Future Slots ({interviewer.interviewSlots?.length || 0})
                </p>
                <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                  {interviewer.interviewSlots && interviewer.interviewSlots.length > 0 ? (
                    interviewer.interviewSlots.map((slot) => (
                      <div key={slot.id} className="text-[10px] p-1.5 bg-muted rounded flex items-center justify-between group">
                        <span>{format(new Date(slot.startTime), 'MMM d, h:mm a')}</span>
                        {!slot.isBooked ? (
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            disabled={deletingSlotId === slot.id}
                            className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                          >
                            {deletingSlotId === slot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        ) : (
                          <span className="text-amber-600 font-bold uppercase text-[8px]">Booked</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">No future slots added</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedInterviewer(interviewer);
                    setIsAddSlotOpen(true);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" /> Single
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedInterviewer(interviewer);
                    setIsBulkSlotOpen(true);
                  }}
                >
                  <Repeat className="h-4 w-4 mr-2" /> Bulk
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isBulkSlotOpen} onOpenChange={(open) => {
        setIsBulkSlotOpen(open);
        if (!open) setSelectedDays([]);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Add Slots: {selectedInterviewer?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkAddSlot} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-3">
                {days.map((day) => (
                  <div key={day.value} className="flex items-center space-x-1.5">
                    <Checkbox 
                      id={`admin-day-${day.value}`} 
                      checked={selectedDays.includes(day.value)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedDays([...selectedDays, day.value]);
                        else setSelectedDays(selectedDays.filter(d => d !== day.value));
                      }}
                    />
                    <Label htmlFor={`admin-day-${day.value}`} className="text-[10px] font-normal cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="startTime" className="text-[10px]">Start Time</Label>
                <Input id="startTime" name="startTime" type="time" required className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endTime" className="text-[10px]">End Time</Label>
                <Input id="endTime" name="endTime" type="time" required className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="durationMinutes" className="text-[10px]">Slot Duration (min)</Label>
                <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue="30" min="15" max="180" required className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="breakMinutes" className="text-[10px]">Break (min)</Label>
                <Input id="breakMinutes" name="breakMinutes" type="number" defaultValue="0" min="0" max="60" required className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="startDate" className="text-[10px]">From Date</Label>
                <Input id="startDate" name="startDate" type="date" required min={format(new Date(), 'yyyy-MM-dd')} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate" className="text-[10px]">Until Date</Label>
                <Input id="endDate" name="endDate" type="date" required className="h-8 text-xs" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" size="sm" disabled={isBulkAddingSlot}>
                {isBulkAddingSlot && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate Slots
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSlotOpen} onOpenChange={setIsAddSlotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Free Slot for {selectedInterviewer?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSlot} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" name="startTime" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" name="endTime" type="datetime-local" required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isAddingSlot}>
                {isAddingSlot && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Slot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
