import { Button, Text } from '@react-email/components';
import { Layout, buttonStyle, noteStyle } from './Layout';

interface ForgotPasswordEmailProps {
  name: string;
  resetUrl: string;
}

export function ForgotPasswordEmail({ name, resetUrl }: ForgotPasswordEmailProps) {
  return (
    <Layout previewText="Reset your LexAssess password" heading="Reset Your Password">
      <Text>Hi {name},</Text>
      <Text>We received a request to reset the password for your LexAssess account. Click the button below to choose a new password.</Text>
      <Button href={resetUrl} style={buttonStyle}>
        Reset Password
      </Button>
      <Text style={noteStyle}>
        This link expires in 24 hours. If you did not request a password reset, you can safely ignore this email — your password will
        not be changed.
      </Text>
    </Layout>
  );
}
