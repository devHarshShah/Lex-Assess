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
    <div className="w-full">
      {myInterviews.length > 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Video className="h-5 w-5" style={{ color: '#d97706' }} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Your Scheduled Sessions</h3>
                <p className="text-xs text-slate-500">Professional industry expert interviews</p>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myInterviews.map((interview) => (
                <div key={interview.id} className="group p-5 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all hover:border-amber-200 hover:bg-white hover:shadow-md">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#d97706' }}>{format(new Date(interview.slot.startTime), 'EEEE')}</p>
                        <p className="font-bold text-slate-900">{format(new Date(interview.slot.startTime), 'MMM do, yyyy')}</p>
                        <p className="text-2xl font-black text-slate-900">{format(new Date(interview.slot.startTime), 'p')}</p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                        {interview.interviewer?.name.charAt(0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-3 border-y border-slate-100/50">
                       <div className="space-y-0.5">
                         <p className="text-[10px] text-slate-400 font-medium">INTERVIEWER</p>
                         <p className="text-sm font-bold text-slate-700">{interview.interviewer?.name}</p>
                       </div>
                    </div>

                    <div className="pt-1">
                      {interview.status === 'SCHEDULED' ? (
                        <Button className="w-full text-white font-bold h-10 rounded-xl shadow-sm" style={{ backgroundColor: '#d97706' }} asChild>
                          <a href={interview.meetLink} target="_blank" rel="noreferrer">
                            Join Session <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                          <CheckCircle2 className="h-4 w-4" /> Assessment Completed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : canSchedule ? (
        <Card className="border-amber-600/20 bg-white shadow-xl overflow-hidden relative group">
          {/* Subtle accent line at top */}
          <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706, #b45309)' }} />
          
          <div className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                <Sparkles className="h-3 w-3" />
                Premium Feature Unlocked
              </div>
              
              <div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight">Expert Interview Ready</h2>
                <p className="text-slate-500 mt-2 text-lg max-w-xl">
                  Great job! You've cleared all domain tests. Now, schedule a session with an industry professional to complete your assessment.
                </p>
              </div>

              <div className="flex items-center gap-6 pt-2">
                 <div className="flex -space-x-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                       {String.fromCharCode(64 + i)}
                     </div>
                   ))}
                 </div>
                 <p className="text-xs font-medium text-slate-400">Join 500+ students interviewed by experts</p>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full md:w-auto px-10 h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95">
                    Schedule Now
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-none">
                  <div className="bg-slate-900 p-8 text-white">
                    <DialogTitle className="text-3xl font-black">Available Slots</DialogTitle>
                    <p className="text-slate-400 mt-1">Select a time that works best for you</p>
                  </div>
                  
                  <div className="p-8 max-h-[60vh] overflow-y-auto">
                    {availableSlots.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {availableSlots.map((slot) => (
                          <button 
                            key={slot.id} 
                            onClick={() => handleBookSlot(slot.id)}
                            className="group flex flex-col items-start p-5 border border-slate-100 rounded-2xl hover:bg-amber-50/30 transition-all text-left relative overflow-hidden"
                            style={{ borderHoverColor: '#d97706' }}
                          >
                            <style>{`
                              .group:hover { border-color: #d97706 !important; }
                            `}</style>
                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d97706' }}>
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              </div>
                            </div>
                            
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600">
                              {format(new Date(slot.startTime), 'EEEE, MMM do')}
                            </div>
                            <div className="text-xl font-black text-slate-900 group-hover:text-amber-900 leading-none mb-4">{format(new Date(slot.startTime), 'p')}</div>
                            
                            <div className="flex items-center gap-2 mt-auto">
                               <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600">
                                 {slot.interviewer.name.charAt(0)}
                               </div>
                               <span className="text-xs font-bold text-slate-600 group-hover:text-amber-900">{slot.interviewer.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 flex flex-col items-center gap-4">
                        <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center">
                          <Calendar className="h-10 w-10 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-900 font-bold text-lg">No slots available right now</p>
                          <p className="text-slate-500 text-sm">Our experts are currently busy. Please check back later.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-white border-slate-200 border shadow-sm flex items-center justify-center p-8 min-h-[140px] group transition-all hover:bg-slate-50">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left max-w-2xl">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-amber-50 group-hover:rotate-12 transition-all duration-300">
              <Lock className="h-6 w-6 text-slate-300 group-hover:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-slate-900">Expert Interview Locked</CardTitle>
              <CardDescription className="text-slate-500 mt-1 max-w-md">
                Complete all domain tests in your <span className="font-bold" style={{ color: '#d97706' }}>{specialization || 'practice area'}</span> specialization to unlock your professional assessment session.
              </CardDescription>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
