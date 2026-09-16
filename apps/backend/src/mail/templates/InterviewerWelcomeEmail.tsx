import { Button, Text } from '@react-email/components';
import { Layout, buttonStyle, noteStyle } from './Layout';

interface InterviewerWelcomeEmailProps {
  name: string;
  email: string;
  setPasswordUrl: string;
}

export function InterviewerWelcomeEmail({ name, email, setPasswordUrl }: InterviewerWelcomeEmailProps) {
  return (
    <Layout previewText={`Welcome to LexAssess, ${name}!`} heading={`Welcome to LexAssess, ${name}!`}>
      <Text>You have been registered as an interviewer on the LexAssess platform.</Text>
      <Text>
        Your account email is <strong>{email}</strong>. To get started, set your password using the button below.
      </Text>
      <Button href={setPasswordUrl} style={buttonStyle}>
        Set Your Password
      </Button>
      <Text style={noteStyle}>This link expires in 24 hours. If you did not expect this email, please ignore it.</Text>
    </Layout>
  );
}
