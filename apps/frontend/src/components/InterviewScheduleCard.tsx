import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { checkCanSchedule, fetchAvailableSlots, scheduleInterview, fetchMyInterviews, type InterviewSlot, type Interview } from '@/lib/interview';
import { Calendar, Video, CheckCircle2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { format } from 'date-fns';

export function InterviewScheduleCard({ specialization }: { specialization?: string }) {
  const [canSchedule, setCanSchedule] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [availableSlots, setAvailableSlots] = React.useState<InterviewSlot[]>([]);
  const [myInterviews, setMyInterviews] = React.useState<Interview[]>([]);
  const [isBookingOpen, setIsBookingOpen] = React.useState(false);

  React.useEffect(() => {
    init();
  }, [specialization]);

  const init = async () => {
    try {
      const [can, slots, interviews] = await Promise.all([
        checkCanSchedule(),
        fetchAvailableSlots(specialization),
        fetchMyInterviews()
      ]);
      setCanSchedule(can);
      setAvailableSlots(slots);
      setMyInterviews(interviews);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    try {
      await scheduleInterview(slotId);
      toast.success('Interview scheduled successfully!');
      setIsBookingOpen(false);
      init();
    } catch (error) {
      toast.error('Failed to schedule interview');
    }
  };

  if (loading) return null;

  if (!canSchedule && myInterviews.length === 0) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Interview Preparation
          </CardTitle>
          <CardDescription>
            Complete all domain tests in your specialization to unlock professional interview scheduling.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {myInterviews.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-amber-600" />
              Your Interviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {myInterviews.map((interview) => (
              <div key={interview.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-semibold text-sm">{format(new Date(interview.slot.startTime), 'PPP p')}</p>
                  <p className="text-xs text-muted-foreground">with {interview.interviewer?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {interview.status === 'SCHEDULED' ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={interview.meetLink} target="_blank" rel="noreferrer">
                        Join Meet <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canSchedule && (
        <Card className="border-amber-500 shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-amber-900">Book Your Interview</CardTitle>
            <CardDescription className="text-amber-700">
              You've completed your domain tests! Now, schedule a session with an industry expert.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-amber-600 hover:bg-amber-700">
                  Select a Slot
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Available Interview Slots</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-2 py-4">
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div>
                          <p className="font-medium text-sm">{format(new Date(slot.startTime), 'PPP p')}</p>
                          <p className="text-xs text-muted-foreground">with {slot.interviewer.name}</p>
                        </div>
                        <Button size="sm" onClick={() => handleBookSlot(slot.id)}>Book</Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No slots available currently. Please check back later.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
