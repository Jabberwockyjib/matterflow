-- Add AI summary fields to documents table (Google Drive uploaded documents)

ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_document_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_suggested_folder TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN documents.ai_document_type IS 'AI-detected document type (Contract, Policy, etc.)';
COMMENT ON COLUMN documents.ai_summary IS 'AI-generated 2-3 sentence summary of document content';
COMMENT ON COLUMN documents.ai_suggested_folder IS 'AI-suggested folder for the document';
COMMENT ON COLUMN documents.ai_processed_at IS 'Timestamp when AI processing was completed';
