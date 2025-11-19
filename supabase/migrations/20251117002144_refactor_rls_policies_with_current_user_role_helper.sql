-- Refactor RLS policies to use current_user_role() helper function
-- This consolidates repeated role-lookup subqueries into a single stable function
-- for better maintainability and performance

-- Helper function to get current user's role
-- Stable function that returns the role of the authenticated user
-- Uses security definer and row_security = off to avoid RLS recursion
--
-- Behavior:
--   - Returns the user's role ('admin', 'manager', or 'member') if found in public.users
--   - Returns NULL if no user row exists for auth.uid()
--   - NULL return value causes RLS policy comparisons to evaluate to NULL (deny access)
--     This is the intended behavior: users not in public.users should be denied access
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
    SELECT u.role INTO v_role
    FROM public.users AS u
    WHERE u.id = auth.uid();

    -- Explicitly return NULL if no user found (v_role will be NULL if SELECT found no rows)
    -- This ensures RLS policies correctly deny access when user doesn't exist
    RETURN v_role;
END;
$$;

-- Drop existing policies to recreate them with the helper function
DROP POLICY IF EXISTS admins_manage_users ON public.users;
DROP POLICY IF EXISTS users_can_view_self_or_admin ON public.users;
DROP POLICY IF EXISTS admins_manage_teams ON public.teams;
DROP POLICY IF EXISTS teams_visible_to_members ON public.teams;
DROP POLICY IF EXISTS boards_visible_to_team ON public.boards;
DROP POLICY IF EXISTS manage_boards_for_team ON public.boards;
DROP POLICY IF EXISTS lists_visible_to_board_team ON public.lists;
DROP POLICY IF EXISTS manage_lists_for_team ON public.lists;
DROP POLICY IF EXISTS tasks_visible_to_team_or_assignee ON public.tasks;
DROP POLICY IF EXISTS manage_tasks_for_team ON public.tasks;
DROP POLICY IF EXISTS points_history_view ON public.points_history;
DROP POLICY IF EXISTS points_history_manage ON public.points_history;

-- Recreate policies using the helper function
CREATE POLICY admins_manage_users ON public.users
FOR ALL
USING (public.current_user_role() = 'admin'::public.user_role)
WITH CHECK (public.current_user_role() = 'admin'::public.user_role);

CREATE POLICY users_can_view_self_or_admin ON public.users
FOR SELECT
USING (
    (id = auth.uid())
    OR (public.current_user_role() = 'admin'::public.user_role)
);

CREATE POLICY admins_manage_teams ON public.teams
FOR ALL
USING (public.current_user_role() = 'admin'::public.user_role)
WITH CHECK (public.current_user_role() = 'admin'::public.user_role);

CREATE POLICY teams_visible_to_members ON public.teams
FOR SELECT
USING (
    (id = (
        SELECT u.team_id
        FROM public.users AS u
        WHERE u.id = auth.uid()
    ))
    OR (public.current_user_role() = 'admin'::public.user_role)
);

CREATE POLICY boards_visible_to_team ON public.boards
FOR SELECT
USING (
    (team_id = (
        SELECT u.team_id
        FROM public.users AS u
        WHERE u.id = auth.uid()
    ))
    OR (public.current_user_role() = 'admin'::public.user_role)
);

CREATE POLICY manage_boards_for_team ON public.boards
FOR ALL
USING (
    (
        team_id = (
            SELECT u.team_id
            FROM public.users AS u
            WHERE u.id = auth.uid()
        )
        AND (
            public.current_user_role() IN (
                'admin'::public.user_role, 'manager'::public.user_role
            )
        )
    )
    OR (public.current_user_role() = 'admin'::public.user_role)
)
WITH CHECK (
    (
        team_id = (
            SELECT u.team_id
            FROM public.users AS u
            WHERE u.id = auth.uid()
        )
        AND (
            public.current_user_role() IN (
                'admin'::public.user_role, 'manager'::public.user_role
            )
        )
    )
    OR (public.current_user_role() = 'admin'::public.user_role)
);

CREATE POLICY lists_visible_to_board_team ON public.lists
FOR SELECT
USING (
    board_id IN (
        SELECT b.id
        FROM public.boards AS b
        WHERE
            b.team_id = (
                SELECT u.team_id
                FROM public.users AS u
                WHERE u.id = auth.uid()
            )
            OR (public.current_user_role() = 'admin'::public.user_role)
    )
);

CREATE POLICY manage_lists_for_team ON public.lists
FOR ALL
USING (
    (
        board_id IN (
            SELECT b.id
            FROM public.boards AS b
            WHERE b.team_id = (
                SELECT u.team_id
                FROM public.users AS u
                WHERE u.id = auth.uid()
            )
        )
        AND (
            public.current_user_role() IN (
                'admin'::public.user_role, 'manager'::public.user_role
            )
        )
    )
    OR (public.current_user_role() = 'admin'::public.user_role)
)
WITH CHECK (
    (
        board_id IN (
            SELECT b.id
            FROM public.boards AS b
            WHERE b.team_id = (
                SELECT u.team_id
                FROM public.users AS u
                WHERE u.id = auth.uid()
            )
        )
        AND (
            public.current_user_role() IN (
                'admin'::public.user_role, 'manager'::public.user_role
            )
        )
    )
    OR (public.current_user_role() = 'admin'::public.user_role)
);

CREATE POLICY tasks_visible_to_team_or_assignee ON public.tasks
FOR SELECT
USING (
    (
        list_id IN (
            SELECT l.id
            FROM public.lists AS l
            INNER JOIN public.boards AS b ON l.board_id = b.id
            WHERE b.team_id = (
                SELECT u.team_id
                FROM public.users AS u
                WHERE u.id = auth.uid()
            )
        )
    )
    OR (assigned_to = auth.uid())
    OR (public.current_user_role() = 'admin'::public.user_role)
);

CREATE POLICY manage_tasks_for_team ON public.tasks
FOR ALL
USING (
    (
        list_id IN (
            SELECT l.id
            FROM public.lists AS l
            INNER JOIN public.boards AS b ON l.board_id = b.id
            WHERE b.team_id = (
                SELECT u.team_id
                FROM public.users AS u
                WHERE u.id = auth.uid()
            )
        )
        AND (
            public.current_user_role() IN (
                'admin'::public.user_role, 'manager'::public.user_role
            )
        )
    )
    OR (public.current_user_role() = 'admin'::public.user_role)
)
WITH CHECK (
    (
        list_id IN (
            SELECT l.id
            FROM public.lists AS l
            INNER JOIN public.boards AS b ON l.board_id = b.id
            WHERE b.team_id = (
                SELECT u.team_id
                FROM public.users AS u
                WHERE u.id = auth.uid()
            )
        )
        AND (
            public.current_user_role() IN (
                'admin'::public.user_role, 'manager'::public.user_role
            )
        )
    )
    OR (public.current_user_role() = 'admin'::public.user_role)
);

CREATE POLICY points_history_view ON public.points_history
FOR SELECT
USING (
    (user_id = auth.uid())
    OR (public.current_user_role() = 'admin'::public.user_role)
);

CREATE POLICY points_history_manage ON public.points_history
FOR INSERT
WITH CHECK (
    (user_id = auth.uid())
    OR (public.current_user_role() = 'admin'::public.user_role)
);
