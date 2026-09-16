import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';

const BRAND_COLOR = '#d97706';

interface LayoutProps {
  previewText: string;
  heading: string;
  children: React.ReactNode;
}

export function Layout({ previewText, heading, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={headingStyle}>{heading}</Text>
          {children}
          <Hr style={hrStyle} />
          <Section>
            <Text style={footerStyle}>LexAssess — this is an automated message, please do not reply.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: BRAND_COLOR,
  color: '#ffffff',
  padding: '10px 20px',
  textDecoration: 'none',
  borderRadius: '5px',
  fontWeight: 'bold',
};

export const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '15px',
  borderRadius: '5px',
  margin: '20px 0',
};

export const infoLineStyle: React.CSSProperties = {
  margin: '5px 0',
};

export const noteStyle: React.CSSProperties = {
  marginTop: '30px',
  fontSize: '12px',
  color: '#666666',
};

const bodyStyle: React.CSSProperties = {
  fontFamily: 'sans-serif',
  backgroundColor: '#ffffff',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
  border: '1px solid #eeeeee',
  borderRadius: '10px',
};

const headingStyle: React.CSSProperties = {
  color: BRAND_COLOR,
  fontSize: '20px',
  fontWeight: 'bold',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#eeeeee',
  margin: '30px 0 12px',
};

const footerStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#999999',
};
