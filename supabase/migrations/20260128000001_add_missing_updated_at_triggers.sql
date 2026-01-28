-- Add missing updated_at triggers for tables that have the column but no trigger
-- Tables affected: invoices, matter_folders, matters, practice_settings, tasks

-- Invoices
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Matter folders
CREATE TRIGGER update_matter_folders_updated_at
  BEFORE UPDATE ON public.matter_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Matters
CREATE TRIGGER update_matters_updated_at
  BEFORE UPDATE ON public.matters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Practice settings
CREATE TRIGGER update_practice_settings_updated_at
  BEFORE UPDATE ON public.practice_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
