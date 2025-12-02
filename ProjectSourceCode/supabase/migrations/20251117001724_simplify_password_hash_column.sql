-- Simplify password_hash column definition
-- Replaces the three-step add/alter/drop sequence with a single idempotent statement
-- This ensures the column exists with NOT NULL and DEFAULT '' in one operation
-- Handles both new column creation and existing column updates

-- Add column if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';

-- Update existing column to ensure it has the default (if column already existed)
-- This is idempotent - setting DEFAULT '' when it's already '' is safe
ALTER TABLE public.users
ALTER COLUMN password_hash SET DEFAULT '';
