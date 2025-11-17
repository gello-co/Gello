-- Add test helper functions for fast database cleanup
-- These functions are only meant for testing purposes

-- Function to truncate all application tables for test cleanup
-- This is much faster than individual DELETE operations
CREATE OR REPLACE FUNCTION truncate_all_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Truncate in reverse dependency order
  -- CASCADE ensures dependent data is also cleared
  -- RESTART IDENTITY resets sequences to avoid duplicate key errors
  TRUNCATE TABLE points_history RESTART IDENTITY CASCADE;
  TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;
  TRUNCATE TABLE lists RESTART IDENTITY CASCADE;
  TRUNCATE TABLE boards RESTART IDENTITY CASCADE;
  TRUNCATE TABLE teams RESTART IDENTITY CASCADE;
  TRUNCATE TABLE users RESTART IDENTITY CASCADE;
  TRUNCATE TABLE user_context RESTART IDENTITY CASCADE;
  
  -- Delete auth users and identities (known test user IDs from Snaplet Seed)
  -- Must delete identities first due to foreign key constraint
  DELETE FROM auth.identities 
  WHERE user_id IN (
    '52e3e95f-4eb5-5447-8ae5-32e002112cdd',  -- admin@test.com
    'e042dcd7-6802-5c10-a6ef-e2b2b97f8ce7',  -- manager@test.com  
    '83abb662-cbef-5518-aab9-d407f85c2def'   -- member@test.com
  );
  
  DELETE FROM auth.users 
  WHERE id IN (
    '52e3e95f-4eb5-5447-8ae5-32e002112cdd',
    'e042dcd7-6802-5c10-a6ef-e2b2b97f8ce7',
    '83abb662-cbef-5518-aab9-d407f85c2def'
  );
END;
$$;

-- Grant execute permission to service role (used in tests)
GRANT EXECUTE ON FUNCTION truncate_all_tables() TO service_role;

COMMENT ON FUNCTION truncate_all_tables() IS 'Test helper: Truncates all application tables for fast cleanup. Use in tests only.';

