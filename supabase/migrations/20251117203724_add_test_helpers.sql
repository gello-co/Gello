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
  -- Delete all auth users and identities for test cleanup
  -- Must delete identities first due to foreign key constraint
  -- WHERE TRUE is required by PostgREST for DELETE statements
  DELETE FROM auth.identities WHERE TRUE;
  DELETE FROM auth.users WHERE TRUE;
  
  -- Delete all test data from dependent tables
  -- WHERE TRUE is required by PostgREST for DELETE statements
  DELETE FROM points_history WHERE TRUE;
  DELETE FROM tasks WHERE TRUE;
  DELETE FROM lists WHERE TRUE;
  DELETE FROM boards WHERE TRUE;
  DELETE FROM teams WHERE TRUE;
  DELETE FROM user_context WHERE TRUE;
  DELETE FROM users WHERE TRUE;
  
  -- Reset sequences to avoid duplicate key errors on next insert
  ALTER SEQUENCE IF EXISTS points_history_id_seq RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS tasks_id_seq RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS lists_id_seq RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS boards_id_seq RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS teams_id_seq RESTART WITH 1;
END;
$$;

-- Grant execute permission to service role (used in tests)
GRANT EXECUTE ON FUNCTION truncate_all_tables() TO service_role;

COMMENT ON FUNCTION truncate_all_tables() IS 'Test helper: Truncates all application tables for fast cleanup. Use in tests only.';

