// src/lib/email/templates/admin-password-reset.tsx
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

interface AdminPasswordResetEmailProps {
  fullName: string
  temporaryPassword: string
  appUrl: string
}

export const AdminPasswordResetEmail = ({
  fullName,
  temporaryPassword,
  appUrl,
}: AdminPasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Your MatterFlow™ password was reset</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>Password Reset</Text>
          <Text style={paragraph}>Hi {fullName},</Text>
          <Text style={paragraph}>
            An administrator has reset your MatterFlow™ password.
          </Text>
          <Section style={codeBox}>
            <Text style={code}>New Temporary Password: {temporaryPassword}</Text>
          </Section>
          <Text style={paragraph}>
            <Link href={`${appUrl}/auth/sign-in`} style={button}>
              Sign in to MatterFlow™
            </Link>
          </Text>
          <Text style={paragraph}>
            You'll be required to change this password on your next login.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>MatterFlow™ - Control Center</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default AdminPasswordResetEmail

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

const codeBox = {
  background: '#f1f5f9',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const code = {
  fontSize: '14px',
  fontFamily: 'monospace',
  color: '#0f172a',
  margin: '4px 0',
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
