-- Add AI summary fields to matter_documents table

ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_document_type TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_suggested_folder TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN matter_documents.ai_document_type IS 'AI-detected document type (Contract, Policy, etc.)';
COMMENT ON COLUMN matter_documents.ai_summary IS 'AI-generated 2-3 sentence summary of document content';
COMMENT ON COLUMN matter_documents.ai_suggested_folder IS 'AI-suggested folder for the document';
COMMENT ON COLUMN matter_documents.ai_processed_at IS 'Timestamp when AI processing was completed';
