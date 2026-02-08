-- Migration: Billing Workflow Overhaul
-- Creates invoice_line_items table, adds invoice linkage to time_entries,
-- and adds notes field to invoices.

-- 1. Create invoice_line_items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  time_entry_id uuid REFERENCES time_entries(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity_minutes integer NOT NULL DEFAULT 0,
  rate_cents integer NOT NULL DEFAULT 0,
  amount_cents integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_task_id ON invoice_line_items(task_id);
CREATE INDEX idx_invoice_line_items_time_entry_id ON invoice_line_items(time_entry_id);

-- Updated_at trigger
CREATE TRIGGER update_invoice_line_items_updated_at
  BEFORE UPDATE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Staff/admin full access
CREATE POLICY "Staff and admin full access to line items"
  ON invoice_line_items
  FOR ALL
  USING (
    current_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (
    current_user_role() IN ('admin', 'staff')
  );

-- Clients can read line items for their own matters' invoices
CREATE POLICY "Clients can read own matter line items"
  ON invoice_line_items
  FOR SELECT
  USING (
    current_user_role() = 'client'
    AND invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN matters m ON m.id = i.matter_id
      WHERE m.client_id = auth.uid()
    )
  );

-- 2. Add invoice linkage columns to time_entries
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS line_item_id uuid REFERENCES invoice_line_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON time_entries(invoice_id);

-- 3. Add notes column to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS notes text;
