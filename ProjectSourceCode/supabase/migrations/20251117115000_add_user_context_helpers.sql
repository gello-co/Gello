-- Lightweight cache to avoid recursive reads of public.users inside policies
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
ON CONFLICT (user_id) DO NOTHING;

-- Helper to fetch the current user's role from the context cache
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

-- Helper to fetch the current user's team without triggering RLS recursion
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

-- Drop policies that referenced inline queries against public.users
DROP POLICY IF EXISTS users_full_access ON public.users;
DROP POLICY IF EXISTS teams_admin_manage_all ON public.teams;
DROP POLICY IF EXISTS teams_manager_insert ON public.teams;
DROP POLICY IF EXISTS teams_visible_to_members ON public.teams;
DROP POLICY IF EXISTS teams_manager_update ON public.teams;
DROP POLICY IF EXISTS teams_full_access ON public.teams;
DROP POLICY IF EXISTS boards_visible_to_team ON public.boards;
DROP POLICY IF EXISTS manage_boards_for_team ON public.boards;
DROP POLICY IF EXISTS boards_full_access ON public.boards;
DROP POLICY IF EXISTS lists_visible_to_board_team ON public.lists;
DROP POLICY IF EXISTS manage_lists_for_team ON public.lists;
DROP POLICY IF EXISTS lists_full_access ON public.lists;
DROP POLICY IF EXISTS tasks_visible_to_team_or_assignee ON public.tasks;
DROP POLICY IF EXISTS manage_tasks_for_team ON public.tasks;
DROP POLICY IF EXISTS tasks_full_access ON public.tasks;
DROP POLICY IF EXISTS service_role_manage_users ON public.users;
DROP POLICY IF EXISTS managers_view_team_members ON public.users;
DROP POLICY IF EXISTS managers_manage_team_members ON public.users;
DROP POLICY IF EXISTS points_history_full_access ON public.points_history;

CREATE POLICY teams_admin_manage_all ON public.teams
FOR ALL
USING (public.current_user_role() = 'admin'::public.user_role)
WITH CHECK (public.current_user_role() = 'admin'::public.user_role);

CREATE POLICY teams_manager_insert ON public.teams
FOR INSERT
WITH CHECK (
    public.current_user_role() IN (
        'admin'::public.user_role,
        'manager'::public.user_role
    )
);

CREATE POLICY teams_visible_to_members ON public.teams
FOR SELECT
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR id = public.current_user_team_id()
);

CREATE POLICY teams_manager_update ON public.teams
FOR UPDATE
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND id = public.current_user_team_id()
    )
)
WITH CHECK (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND id = public.current_user_team_id()
    )
);

-- Users ----------------------------------------------------------------------
CREATE POLICY service_role_manage_users ON public.users
FOR ALL
USING (
    auth.role() = 'service_role'
    OR auth.uid() IS NULL
)
WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() IS NULL
);

CREATE POLICY managers_view_team_members ON public.users
FOR SELECT
USING (
    public.current_user_role() = 'manager'::public.user_role
    AND (
        team_id IS NULL
        OR team_id = public.current_user_team_id()
    )
);

CREATE POLICY managers_manage_team_members ON public.users
FOR UPDATE
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR id = auth.uid()
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND (
            team_id IS NULL
            OR team_id = public.current_user_team_id()
        )
    )
)
WITH CHECK (
    public.current_user_role() = 'admin'::public.user_role
    OR id = auth.uid()
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND (
            team_id IS NULL
            OR team_id = public.current_user_team_id()
        )
    )
);

-- Boards ---------------------------------------------------------------------
CREATE POLICY boards_visible_to_team ON public.boards
FOR SELECT
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR team_id = public.current_user_team_id()
);

CREATE POLICY manage_boards_for_team ON public.boards
FOR ALL
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND team_id = public.current_user_team_id()
    )
)
WITH CHECK (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND team_id = public.current_user_team_id()
    )
);

-- Lists ----------------------------------------------------------------------
CREATE POLICY lists_visible_to_board_team ON public.lists
FOR SELECT
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR board_id IN (
        SELECT b.id
        FROM public.boards AS b
        WHERE b.team_id = public.current_user_team_id()
    )
);

CREATE POLICY manage_lists_for_team ON public.lists
FOR ALL
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND board_id IN (
            SELECT b.id
            FROM public.boards AS b
            WHERE b.team_id = public.current_user_team_id()
        )
    )
)
WITH CHECK (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND board_id IN (
            SELECT b.id
            FROM public.boards AS b
            WHERE b.team_id = public.current_user_team_id()
        )
    )
);

-- Tasks ----------------------------------------------------------------------
CREATE POLICY tasks_visible_to_team_or_assignee ON public.tasks
FOR SELECT
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR assigned_to = auth.uid()
    OR list_id IN (
        SELECT l.id
        FROM public.lists AS l
        WHERE l.board_id IN (
            SELECT b.id
            FROM public.boards AS b
            WHERE b.team_id = public.current_user_team_id()
        )
    )
);

CREATE POLICY manage_tasks_for_team ON public.tasks
FOR ALL
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND list_id IN (
            SELECT l.id
            FROM public.lists AS l
            WHERE l.board_id IN (
                SELECT b.id
                FROM public.boards AS b
                WHERE b.team_id = public.current_user_team_id()
            )
        )
    )
)
WITH CHECK (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND list_id IN (
            SELECT l.id
            FROM public.lists AS l
            WHERE l.board_id IN (
                SELECT b.id
                FROM public.boards AS b
                WHERE b.team_id = public.current_user_team_id()
            )
        )
    )
);
