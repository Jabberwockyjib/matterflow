import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BaseLayoutProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
}

/**
 * Base email layout for all MatterFlow emails
 * Provides consistent branding and structure
 */
export const BaseLayout = ({ preview, heading, children }: BaseLayoutProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>MatterFlow™</Heading>
        </Section>
        <Section style={content}>
          <Heading as="h2" style={h2}>
            {heading}
          </Heading>
          {children}
        </Section>
        <Section style={footer}>
          <Text style={footerText}>
            © {new Date().getFullYear()} MatterFlow. Workflow-first legal practice system.
          </Text>
          <Text style={footerText}>
            This is an automated message. Please do not reply to this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const header = {
  padding: "32px 40px",
  borderBottom: "1px solid #e2e8f0",
};

const h1 = {
  color: "#1e293b",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0",
  padding: "0",
};

const content = {
  padding: "40px",
};

const h2 = {
  color: "#1e293b",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 20px",
};

const footer = {
  padding: "0 40px",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "32px",
};

const footerText = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "4px 0",
};
