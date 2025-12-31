-- Add description column to tasks table for storing additional task details
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text;

-- Add helpful comment
COMMENT ON COLUMN tasks.description IS 'Optional text description or JSON data for task details (e.g., meeting info, instructions)';
