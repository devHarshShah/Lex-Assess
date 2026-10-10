import { Button, Text } from '@react-email/components';
import { Layout, buttonStyle, noteStyle } from './Layout';

interface CompanyWelcomeEmailProps {
  name: string;
  email: string;
  companyName: string;
  setPasswordUrl: string;
}

export function CompanyWelcomeEmail({ name, email, companyName, setPasswordUrl }: CompanyWelcomeEmailProps) {
  return (
    <Layout previewText={`Welcome to LexAssess, ${name}!`} heading={`Welcome to LexAssess, ${name}!`}>
      <Text>
        A company account for <strong>{companyName}</strong> has been set up for you on the LexAssess platform.
      </Text>
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
