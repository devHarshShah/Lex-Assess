import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { fetchInterviewerSessions, addFeedback, type Interview } from '@/lib/interview';
import { MessageSquare, Loader2, ExternalLink, Calendar, ListChecks } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { InterviewerSlotManagement } from '../components/InterviewerSlotManagement';
import { format } from 'date-fns';

export function InterviewerDashboardPage() {
  const [sessions, setSessions] = React.useState<Interview[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedInterview, setSelectedInterview] = React.useState<Interview | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);

  React.useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await fetchInterviewerSessions();
      setSessions(data);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInterview) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      marks: parseInt(formData.get('marks') as string),
      notes: formData.get('notes') as string,
    };

    setIsSubmittingFeedback(true);
    try {
      await addFeedback(selectedInterview.id, data);
      toast.success('Feedback submitted successfully');
      setSelectedInterview(null);
      loadSessions();
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const upcoming = sessions.filter(s => s.status === 'SCHEDULED');
  const past = sessions.filter(s => s.status === 'COMPLETED');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Interviewer Dashboard</h2>
        <p className="text-muted-foreground">Manage your upcoming interviews and your availability slots.</p>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Sessions
          </TabsTrigger>
          <TabsTrigger value="slots" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Availability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Upcoming Sessions</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.length > 0 ? upcoming.map((session) => (
                <Card key={session.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{session.student?.name}</CardTitle>
                    <CardDescription>{format(new Date(session.slot.startTime), 'PPP p')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full" asChild>
                      <a href={session.meetLink} target="_blank" rel="noreferrer">
                        Join Google Meet <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setSelectedInterview(session)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" /> Complete & Feedback
                    </Button>
                  </CardContent>
                </Card>
              )) : <p className="text-muted-foreground text-sm py-4">No upcoming sessions.</p>}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Completed Sessions</h3>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {past.length > 0 ? past.map((session) => (
                    <div key={session.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{session.student?.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(session.slot.startTime), 'PPP')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{session.marks}/100</p>
                        <p className="text-xs text-muted-foreground italic">Marks given</p>
                      </div>
                    </div>
                  )) : <p className="p-8 text-center text-muted-foreground text-sm">No completed sessions yet.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="slots">
          <InterviewerSlotManagement />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedInterview} onOpenChange={(open: boolean) => !open && setSelectedInterview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Interview Feedback: {selectedInterview?.student?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFeedback} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="marks">Marks (0-100)</Label>
              <Input id="marks" name="marks" type="number" min="0" max="100" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Interviewer Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Candidate's strengths, weaknesses, and general observations..." required className="h-32" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmittingFeedback}>
                {isSubmittingFeedback && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Feedback & Mark Completed
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
