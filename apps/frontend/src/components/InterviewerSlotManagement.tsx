import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchMySlots, bulkAddMySlots, deleteSlot, type InterviewSlot } from '@/lib/interview';
import { Calendar, Trash2, Loader2, Repeat } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { format } from 'date-fns';
import { Checkbox } from './ui/checkbox';

export function InterviewerSlotManagement() {
  const [slots, setSlots] = React.useState<InterviewSlot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isBulkOpen, setIsBulkOpen] = React.useState(false);
  const [selectedDays, setSelectedDays] = React.useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingSlotId, setDeletingSlotId] = React.useState<string | null>(null);

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
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      const data = await fetchMySlots();
      setSlots(data);
    } catch (error) {
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingSlotId(id);
    try {
      await deleteSlot(id);
      toast.success('Slot deleted');
      loadSlots();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete slot');
    } finally {
      setDeletingSlotId(null);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

    setIsSubmitting(true);
    try {
      const res = await bulkAddMySlots(data);
      toast.success(`${res.count} slots added successfully`);
      setIsBulkOpen(false);
      setSelectedDays([]);
      loadSlots();
    } catch (error) {
      toast.error('Failed to add slots');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const upcomingSlots = slots.filter(s => new Date(s.startTime) > new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Availability Slots</h3>
        <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Repeat className="h-4 w-4 mr-2" /> Recurring Slots
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Recurring Slots</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBulkAdd} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-4">
                  {days.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`day-${day.value}`} 
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedDays([...selectedDays, day.value]);
                          else setSelectedDays(selectedDays.filter(d => d !== day.value));
                        }}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm font-normal cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" name="startTime" type="time" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" name="endTime" type="time" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Slot Duration (min)</Label>
                  <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue="30" min="15" max="180" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breakMinutes">Break Between (min)</Label>
                  <Input id="breakMinutes" name="breakMinutes" type="number" defaultValue="0" min="0" max="60" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">From Date</Label>
                  <Input id="startDate" name="startDate" type="date" required min={format(new Date(), 'yyyy-MM-dd')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Until Date</Label>
                  <Input id="endDate" name="endDate" type="date" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Slots
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {upcomingSlots.length > 0 ? upcomingSlots.map((slot) => (
          <Card key={slot.id} className={slot.isBooked ? 'border-amber-200 bg-amber-50/20' : ''}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium">
                  {format(new Date(slot.startTime), 'EEE, MMM d')}
                </CardTitle>
                <CardDescription>
                  {format(new Date(slot.startTime), 'p')} - {format(new Date(slot.endTime), 'p')}
                </CardDescription>
              </div>
              {!slot.isBooked && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(slot.id)}
                  disabled={deletingSlotId === slot.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deletingSlotId === slot.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {slot.isBooked ? (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Booked by student
                </div>
              ) : (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Available
                </div>
              )}
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
            <p className="mt-2 text-sm text-muted-foreground">No upcoming slots found.</p>
            <p className="text-xs text-muted-foreground">Add your availability to let students book interviews.</p>
          </div>
        )}
      </div>
    </div>
  );
}
