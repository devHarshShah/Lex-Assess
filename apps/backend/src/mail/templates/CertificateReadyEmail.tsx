import { Button, Section, Text } from '@react-email/components';
import { Layout, buttonStyle, infoBoxStyle, infoLineStyle, noteStyle } from './Layout';

interface CertificateReadyEmailProps {
  name: string;
  rollNumber: string;
  practiceArea: string;
  certificateUrl: string;
}

export function CertificateReadyEmail({ name, rollNumber, practiceArea, certificateUrl }: CertificateReadyEmailProps) {
  return (
    <Layout previewText="Your LexAssess certificate is ready" heading="Your Certificate Is Ready">
      <Text>Hi {name},</Text>
      <Text>Your LexAssess certificate has been generated and is ready to view or download.</Text>
      <Section style={infoBoxStyle}>
        <Text style={infoLineStyle}>
          <strong>Roll Number:</strong> {rollNumber}
        </Text>
        <Text style={infoLineStyle}>
          <strong>Practice Area:</strong> {practiceArea}
        </Text>
      </Section>
      <Button href={certificateUrl} style={buttonStyle}>
        View Your Certificate
      </Button>
      <Text style={noteStyle}>Log in to your LexAssess account to view or download your certificate at any time.</Text>
    </Layout>
  );
}
