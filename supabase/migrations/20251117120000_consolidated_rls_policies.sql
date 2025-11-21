-- Consolidated RLS policies and role grants for application tables.
-- This migration replaces legacy policies with a simple triad
-- (admin, manager, member) and ensures helpers pull security context
-- from the user_context cache only.

--------------------------------------------------------------------------------
-- Role setup
--------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'app_admin'
    ) THEN
        CREATE ROLE app_admin NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'app_authenticated'
    ) THEN
        CREATE ROLE app_authenticated NOLOGIN;
    END IF;
END;
$$;

-- Map Supabase managed roles to the application roles
GRANT app_admin TO service_role;
GRANT app_authenticated TO authenticated;

-- Revoke blanket access from PUBLIC and grant via application roles only
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM public;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM public;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_admin;

GRANT SELECT,
INSERT,
UPDATE,
DELETE ON ALL TABLES IN SCHEMA public TO app_authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_authenticated;

--------------------------------------------------------------------------------
-- user_context cache and helper functions
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_context (
    user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    team_id uuid
);

CREATE OR REPLACE FUNCTION public.sync_user_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.user_context WHERE user_id = OLD.id;
        RETURN OLD;
    END IF;

    INSERT INTO public.user_context AS ctx (user_id, role, team_id)
    VALUES (NEW.id, NEW.role, NEW.team_id)
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        team_id = EXCLUDED.team_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_context ON public.users;
CREATE TRIGGER sync_user_context
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_context();

INSERT INTO public.user_context (user_id, role, team_id)
SELECT
    u.id,
    u.role,
    u.team_id
FROM public.users AS u
ON CONFLICT (user_id) DO UPDATE
SET role = excluded.role,
team_id = excluded.team_id;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT ctx.role
    INTO v_role
    FROM public.user_context AS ctx
    WHERE ctx.user_id = auth.uid();

    RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_team_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_team_id uuid;
BEGIN
    SELECT ctx.team_id
    INTO v_team_id
    FROM public.user_context AS ctx
    WHERE ctx.user_id = auth.uid();

    RETURN v_team_id;
END;
$$;

--------------------------------------------------------------------------------
-- Drop existing policies to rebuild cleanly
--------------------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'users',
              'teams',
              'boards',
              'lists',
              'tasks',
              'points_history'
          )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            rec.policyname,
            rec.schemaname,
            rec.tablename
        );
    END LOOP;
END;
$$;

--------------------------------------------------------------------------------
-- Ensure RLS is enabled
--------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- Policy helpers for reuse
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT public.current_user_role() = 'admin'::public.user_role;
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of_current_team()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT public.current_user_role() = 'manager'::public.user_role
        AND public.current_user_team_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT public.current_user_role() = 'member'::public.user_role;
$$;

CREATE OR REPLACE FUNCTION public.user_in_current_team(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_context AS ctx
        WHERE
            ctx.user_id = target_user
            AND ctx.team_id = public.current_user_team_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.board_in_current_team(target_board uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.boards AS b
        WHERE b.id = target_board
            AND b.team_id = public.current_user_team_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.list_in_current_team(target_list uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.lists AS l
            INNER JOIN public.boards AS b ON l.board_id = b.id
        WHERE l.id = target_list
            AND b.team_id = public.current_user_team_id()
    );
$$;

--------------------------------------------------------------------------------
-- USERS
--------------------------------------------------------------------------------
CREATE POLICY users_admin_all ON public.users
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY users_manager_team ON public.users
FOR ALL
USING (
    public.is_manager_of_current_team()
    AND (
        id = auth.uid()
        OR team_id = public.current_user_team_id()
        OR team_id IS NULL
    )
)
WITH CHECK (
    public.is_manager_of_current_team()
    AND (
        id = auth.uid()
        OR team_id = public.current_user_team_id()
        OR team_id IS NULL
    )
);

CREATE POLICY users_member_self_read ON public.users
FOR SELECT
USING (
    public.is_member()
    AND id = auth.uid()
);

CREATE POLICY users_service_role ON public.users
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);

--------------------------------------------------------------------------------
-- TEAMS
--------------------------------------------------------------------------------
CREATE POLICY teams_admin_all ON public.teams
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY teams_manager_team ON public.teams
FOR ALL
USING (
    public.is_manager_of_current_team()
    AND id = public.current_user_team_id()
)
WITH CHECK (
    public.is_manager_of_current_team()
    AND id = public.current_user_team_id()
);

CREATE POLICY teams_member_read ON public.teams
FOR SELECT
USING (
    public.is_member()
    AND id = public.current_user_team_id()
);

CREATE POLICY teams_service_role ON public.teams
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);

--------------------------------------------------------------------------------
-- BOARDS
--------------------------------------------------------------------------------
CREATE POLICY boards_admin_all ON public.boards
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY boards_manager_team ON public.boards
FOR ALL
USING (
    public.is_manager_of_current_team()
    AND team_id = public.current_user_team_id()
)
WITH CHECK (
    public.is_manager_of_current_team()
    AND team_id = public.current_user_team_id()
);

CREATE POLICY boards_member_read ON public.boards
FOR SELECT
USING (
    public.is_member()
    AND team_id = public.current_user_team_id()
);

CREATE POLICY boards_service_role ON public.boards
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);

--------------------------------------------------------------------------------
-- LISTS
--------------------------------------------------------------------------------
CREATE POLICY lists_admin_all ON public.lists
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY lists_manager_team ON public.lists
FOR ALL
USING (
    public.is_manager_of_current_team()
    AND public.board_in_current_team(board_id)
)
WITH CHECK (
    public.is_manager_of_current_team()
    AND public.board_in_current_team(board_id)
);

CREATE POLICY lists_member_read ON public.lists
FOR SELECT
USING (
    public.is_member()
    AND public.board_in_current_team(board_id)
);

CREATE POLICY lists_service_role ON public.lists
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);

--------------------------------------------------------------------------------
-- TASKS
--------------------------------------------------------------------------------
CREATE POLICY tasks_admin_all ON public.tasks
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY tasks_manager_team ON public.tasks
FOR ALL
USING (
    public.is_manager_of_current_team()
    AND public.list_in_current_team(list_id)
)
WITH CHECK (
    public.is_manager_of_current_team()
    AND public.list_in_current_team(list_id)
);

CREATE POLICY tasks_member_read ON public.tasks
FOR SELECT
USING (
    public.is_member()
    AND (
        public.list_in_current_team(list_id)
        OR assigned_to = auth.uid()
    )
);

CREATE POLICY tasks_member_update_assigned ON public.tasks
FOR UPDATE
USING (
    public.is_member()
    AND assigned_to = auth.uid()
)
WITH CHECK (
    public.is_member()
    AND assigned_to = auth.uid()
);

CREATE POLICY tasks_service_role ON public.tasks
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);

--------------------------------------------------------------------------------
-- POINTS HISTORY
--------------------------------------------------------------------------------
CREATE POLICY points_history_admin_all ON public.points_history
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY points_history_manager_team ON public.points_history
FOR ALL
USING (
    public.is_manager_of_current_team()
    AND public.user_in_current_team(user_id)
)
WITH CHECK (
    public.is_manager_of_current_team()
    AND public.user_in_current_team(user_id)
);

CREATE POLICY points_history_member_read ON public.points_history
FOR SELECT
USING (
    public.is_member()
    AND user_id = auth.uid()
);

CREATE POLICY points_history_service_role ON public.points_history
FOR ALL
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);
