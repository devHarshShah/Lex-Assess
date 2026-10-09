import { Button, Section, Text } from '@react-email/components';
import { Layout, buttonStyle, infoBoxStyle, infoLineStyle, noteStyle } from './Layout';

export type CompanyInterviewEmailVariant = 'scheduled' | 'rescheduled' | 'cancelled';

export interface CompanyInterviewEmailProps {
  variant: CompanyInterviewEmailVariant;
  audience: 'student' | 'company';
  recipientName: string;
  companyName: string;
  studentName: string;
  studentCollege?: string | null;
  practiceArea?: string | null;
  formattedDate: string;
  durationMin: number;
  previousFormattedDate?: string | null;
  meetLink?: string | null;
  // Superadmin's personal note, plain text
  message?: string | null;
  cancelReason?: string | null;
}

const HEADINGS: Record<CompanyInterviewEmailVariant, string> = {
  scheduled: 'Interview Scheduled',
  rescheduled: 'Interview Rescheduled',
  cancelled: 'Interview Cancelled',
};

export function companyInterviewSubject(p: Pick<CompanyInterviewEmailProps, 'variant' | 'audience' | 'companyName' | 'studentName'>) {
  const who = p.audience === 'student' ? p.companyName : p.studentName;
  if (p.variant === 'rescheduled') return `Interview rescheduled: ${who}`;
  if (p.variant === 'cancelled') return `Interview cancelled: ${who}`;
  return p.audience === 'student'
    ? `Interview invitation from ${p.companyName}`
    : `Interview scheduled with ${p.studentName} (LexAssess candidate)`;
}

export function CompanyInterviewEmail(p: CompanyInterviewEmailProps) {
  const heading = HEADINGS[p.variant];
  const intro =
    p.variant === 'cancelled'
      ? p.audience === 'student'
        ? `Your interview with ${p.companyName} has been cancelled.`
        : `Your interview with LexAssess candidate ${p.studentName} has been cancelled.`
      : p.variant === 'rescheduled'
        ? p.audience === 'student'
          ? `Your interview with ${p.companyName} has moved to a new time.`
          : `Your interview with LexAssess candidate ${p.studentName} has moved to a new time.`
        : p.audience === 'student'
          ? `Good news! ${p.companyName} would like to interview you. The LexAssess team has scheduled it for you.`
          : `The LexAssess team has scheduled an interview for you with candidate ${p.studentName}.`;
  const paragraphs = (p.message ?? '').split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);

  return (
    <Layout previewText={`${heading}: ${p.audience === 'student' ? p.companyName : p.studentName}`} heading={heading}>
      <Text>Hello {p.recipientName},</Text>
      <Text>{intro}</Text>
      <Section style={infoBoxStyle}>
        <Text style={infoLineStyle}>
          <strong>Company:</strong> {p.companyName}
        </Text>
        <Text style={infoLineStyle}>
          <strong>Candidate:</strong> {p.studentName}
          {p.studentCollege ? `, ${p.studentCollege}` : ''}
        </Text>
        {p.practiceArea ? (
          <Text style={infoLineStyle}>
            <strong>Practice area:</strong> {p.practiceArea}
          </Text>
        ) : null}
        {p.variant === 'rescheduled' && p.previousFormattedDate ? (
          <Text style={infoLineStyle}>
            <strong>Previously:</strong> <s>{p.previousFormattedDate} (IST)</s>
          </Text>
        ) : null}
        <Text style={infoLineStyle}>
          <strong>{p.variant === 'cancelled' ? 'Was scheduled for' : 'Date & Time'}:</strong> {p.formattedDate} (IST)
        </Text>
        {p.variant !== 'cancelled' ? (
          <Text style={infoLineStyle}>
            <strong>Duration:</strong> {p.durationMin} minutes
          </Text>
        ) : null}
      </Section>
      {p.variant === 'cancelled' && p.cancelReason ? (
        <Text>
          <strong>Reason:</strong> {p.cancelReason}
        </Text>
      ) : null}
      {paragraphs.map((t, i) => (
        <Text key={i} style={{ whiteSpace: 'pre-line' }}>
          {t}
        </Text>
      ))}
      {p.variant !== 'cancelled' && p.meetLink ? (
        <>
          <Text>Join the interview using the button below. A calendar invite has also been sent to you.</Text>
          <Button href={p.meetLink} style={buttonStyle}>
            Join Interview
          </Button>
        </>
      ) : null}
      {p.variant !== 'cancelled' ? (
        <Text style={noteStyle}>Please join a few minutes early. If you can't make it, contact the LexAssess team as soon as possible.</Text>
      ) : (
        <Text style={noteStyle}>The calendar event has been removed. The LexAssess team will be in touch if a new time is arranged.</Text>
      )}
    </Layout>
  );
}
