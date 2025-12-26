// src/lib/email/templates/password-reset.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'

interface PasswordResetEmailProps {
  resetLink: string
}

export const PasswordResetEmail = ({ resetLink }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your MatterFlow™ password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>Reset your password</Text>
          <Text style={paragraph}>
            We received a request to reset your MatterFlow™ password.
          </Text>
          <Text style={paragraph}>
            <Link href={resetLink} style={button}>
              Reset Password
            </Link>
          </Text>
          <Text style={paragraph}>
            This link expires in 1 hour.
          </Text>
          <Text style={paragraph}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>MatterFlow™ - Control Center</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

// Reuse styles from invitation email
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const section = {
  padding: '0 48px',
}

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1e293b',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#334155',
}

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '16px 0',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
}

const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '16px',
}
