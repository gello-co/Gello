-- Align core database schema with the restructure plan
-- This migration ensures enum types exist before tables are created

-- Ensure enum types exist
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'user_role'
			AND typnamespace = 'public'::regnamespace
	) THEN
		CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'member');
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'points_reason'
			AND typnamespace = 'public'::regnamespace
	) THEN
		CREATE TYPE public.points_reason AS ENUM ('task_complete', 'manual_award');
	END IF;
END
$$;
