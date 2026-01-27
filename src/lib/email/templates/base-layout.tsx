import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { DEFAULT_FIRM_SETTINGS, type FirmSettings } from "@/types/firm-settings";

interface BaseLayoutProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
  settings?: FirmSettings;
}

/**
 * Base email layout for all MatterFlow emails
 * Provides consistent branding and structure
 */
export const BaseLayout = ({
  preview,
  heading,
  children,
  settings = DEFAULT_FIRM_SETTINGS,
}: BaseLayoutProps) => {
  const primaryColor = settings.primary_color || DEFAULT_FIRM_SETTINGS.primary_color;
  const firmName = settings.firm_name || DEFAULT_FIRM_SETTINGS.firm_name;
  const tagline = settings.tagline || DEFAULT_FIRM_SETTINGS.tagline;
  const footerText = settings.footer_text;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            {settings.logo_url ? (
              <Img
                src={settings.logo_url}
                alt={firmName}
                height="40"
                style={{ maxWidth: "200px", height: "auto" }}
              />
            ) : (
              <Heading style={{ ...h1, color: primaryColor }}>{firmName}</Heading>
            )}
          </Section>
          <Section style={content}>
            <Heading as="h2" style={{ ...h2, color: primaryColor }}>
              {heading}
            </Heading>
            {children}
          </Section>
          <Section style={footer}>
            <Text style={footerTextStyle}>
              © {new Date().getFullYear()} {firmName}. {tagline}
            </Text>
            {footerText && (
              <Text style={footerTextStyle}>{footerText}</Text>
            )}
            <Text style={footerTextStyle}>
              This is an automated message. Please do not reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

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

const footerTextStyle = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "4px 0",
};
