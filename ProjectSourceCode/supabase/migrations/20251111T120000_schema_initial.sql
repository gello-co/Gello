-- Align core database schema with the restructure plan

-- Drop policies that depend on textual role comparisons or use spaces in identifiers
DROP POLICY IF EXISTS boards_visible_to_team ON public.boards;
DROP POLICY IF EXISTS manage_boards_for_team ON public.boards;
DROP POLICY IF EXISTS lists_visible_to_board_team ON public.lists;
DROP POLICY IF EXISTS manage_lists_for_team ON public.lists;
DROP POLICY IF EXISTS points_history_manage ON public.points_history;
DROP POLICY IF EXISTS points_history_view ON public.points_history;
DROP POLICY IF EXISTS manage_tasks_for_team ON public.tasks;
DROP POLICY IF EXISTS tasks_visible_to_team_or_assignee ON public.tasks;
DROP POLICY IF EXISTS members_update_assigned_tasks ON public.tasks;
DROP POLICY IF EXISTS admins_manage_teams ON public.teams;
DROP POLICY IF EXISTS teams_visible_to_members ON public.teams;
DROP POLICY IF EXISTS admins_manage_users ON public.users;
DROP POLICY IF EXISTS users_can_update_self ON public.users;
DROP POLICY IF EXISTS users_can_view_self_or_admin ON public.users;

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

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.users
ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;
ALTER TABLE public.users
ALTER COLUMN role SET DEFAULT 'member';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash text NOT NULL
DEFAULT '';
ALTER TABLE public.users
ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE public.users
ALTER COLUMN password_hash DROP DEFAULT;

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

ALTER TABLE public.points_history DROP CONSTRAINT IF EXISTS points_history_reason_check;
ALTER TABLE public.points_history
ALTER COLUMN reason TYPE public.points_reason USING reason::text::public.points_reason;

-- Recreate row-level security policies with enum comparisons
CREATE POLICY admins_manage_users ON public.users
FOR ALL
USING (
    (
        SELECT u.role
        FROM public.users AS u
        WHERE u.id = auth.uid()
    ) = 'admin'::public.user_role
)
WITH CHECK (
    (
        SELECT u.role
        FROM public.users AS u
        WHERE u.id = auth.uid()
    ) = 'admin'::public.user_role
);

CREATE POLICY users_can_update_self ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY users_can_view_self_or_admin ON public.users
FOR SELECT
USING (
    (id = auth.uid())
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
);

CREATE POLICY admins_manage_teams ON public.teams
FOR ALL
USING (
    (
        SELECT u.role
        FROM public.users AS u
        WHERE u.id = auth.uid()
    ) = 'admin'::public.user_role
)
WITH CHECK (
    (
        SELECT u.role
        FROM public.users AS u
        WHERE u.id = auth.uid()
    ) = 'admin'::public.user_role
);

CREATE POLICY teams_visible_to_members ON public.teams
FOR SELECT
USING (
    (id = (
        SELECT u.team_id
        FROM public.users AS u
        WHERE u.id = auth.uid()
    ))
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
);

CREATE POLICY boards_visible_to_team ON public.boards
FOR SELECT
USING (
    (team_id = (
        SELECT u.team_id
        FROM public.users AS u
        WHERE u.id = auth.uid()
    ))
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
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
            (
                SELECT u.role
                FROM public.users AS u
                WHERE u.id = auth.uid()
            ) IN ('admin'::public.user_role, 'manager'::public.user_role)
        )
    )
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
)
WITH CHECK (
    (
        team_id = (
            SELECT u.team_id
            FROM public.users AS u
            WHERE u.id = auth.uid()
        )
        AND (
            (
                SELECT u.role
                FROM public.users AS u
                WHERE u.id = auth.uid()
            ) IN ('admin'::public.user_role, 'manager'::public.user_role)
        )
    )
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
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
            OR (
                (
                    SELECT u.role
                    FROM public.users AS u
                    WHERE u.id = auth.uid()
                ) = 'admin'::public.user_role
            )
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
            (
                SELECT u.role
                FROM public.users AS u
                WHERE u.id = auth.uid()
            ) IN ('admin'::public.user_role, 'manager'::public.user_role)
        )
    )
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
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
            (
                SELECT u.role
                FROM public.users AS u
                WHERE u.id = auth.uid()
            ) IN ('admin'::public.user_role, 'manager'::public.user_role)
        )
    )
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
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
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
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
            (
                SELECT u.role
                FROM public.users AS u
                WHERE u.id = auth.uid()
            ) IN ('admin'::public.user_role, 'manager'::public.user_role)
        )
    )
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
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
            (
                SELECT u.role
                FROM public.users AS u
                WHERE u.id = auth.uid()
            ) IN ('admin'::public.user_role, 'manager'::public.user_role)
        )
    )
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
);

CREATE POLICY members_update_assigned_tasks ON public.tasks
FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

CREATE POLICY points_history_view ON public.points_history
FOR SELECT
USING (
    (user_id = auth.uid())
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
);

CREATE POLICY points_history_manage ON public.points_history
FOR INSERT
WITH CHECK (
    (user_id = auth.uid())
    OR (
        (
            SELECT u.role
            FROM public.users AS u
            WHERE u.id = auth.uid()
        ) = 'admin'::public.user_role
    )
);
