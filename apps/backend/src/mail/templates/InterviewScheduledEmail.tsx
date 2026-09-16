import { Button, Section, Text } from '@react-email/components';
import { Layout, buttonStyle, infoBoxStyle, infoLineStyle, noteStyle } from './Layout';

interface InterviewScheduledEmailProps {
  userName: string;
  interviewerName: string;
  formattedDate: string;
  meetLink: string;
}

export function InterviewScheduledEmail({ userName, interviewerName, formattedDate, meetLink }: InterviewScheduledEmailProps) {
  return (
    <Layout previewText="Interview Confirmed" heading="Interview Confirmed">
      <Text>Hello,</Text>
      <Text>An interview has been successfully scheduled.</Text>
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
