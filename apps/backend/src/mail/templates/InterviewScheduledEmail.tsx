import { Button, Section, Text } from '@react-email/components';
import { Layout, buttonStyle, infoBoxStyle, infoLineStyle, noteStyle } from './Layout';

interface InterviewScheduledEmailProps {
  userName: string;
  interviewerName: string;
  formattedDate: string;
  meetLink: string;
  updated?: boolean;
}

export function InterviewScheduledEmail({ userName, interviewerName, formattedDate, meetLink, updated }: InterviewScheduledEmailProps) {
  const heading = updated ? 'Interview Updated' : 'Interview Confirmed';
  return (
    <Layout previewText={heading} heading={heading}>
      <Text>Hello,</Text>
      <Text>
        {updated
          ? 'The details of this interview have changed. Please note the updated interviewer and time below.'
          : 'An interview has been successfully scheduled.'}
      </Text>
      <Section style={infoBoxStyle}>
        <Text style={infoLineStyle}>
          <strong>Student:</strong> {userName}
        </Text>
        <Text style={infoLineStyle}>
          <strong>Interviewer:</strong> {interviewerName}
        </Text>
        <Text style={infoLineStyle}>
          <strong>Date &amp; Time:</strong> {formattedDate} (IST)
        </Text>
      </Section>
      <Text>You can join the interview via Google Meet using the button below:</Text>
      <Button href={meetLink} style={buttonStyle}>
        Join Google Meet
      </Button>
      <Text style={noteStyle}>Please ensure you join at least 5 minutes early.</Text>
    </Layout>
  );
}
