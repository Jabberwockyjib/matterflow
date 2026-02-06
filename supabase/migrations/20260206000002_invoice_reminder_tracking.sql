-- Add last_reminder_sent_at to invoices for duplicate prevention
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- Seed new firm_settings keys for invoice reminder configuration
INSERT INTO firm_settings (key, value)
VALUES
  ('automation_invoice_first_reminder_days', '15'),
  ('automation_invoice_due_date_reminder', 'true'),
  ('automation_invoice_overdue_frequency_days', '7')
ON CONFLICT (key) DO NOTHING;
