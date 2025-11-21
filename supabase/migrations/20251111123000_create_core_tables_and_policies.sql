-- Create core tables and row level security
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Teams --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.teams
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS name text;

UPDATE public.teams
SET name = coalesce(name, 'Team')
WHERE name IS NULL;

ALTER TABLE public.teams
ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.teams
ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.teams
ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams FORCE ROW LEVEL SECURITY;

-- Users --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    role public.user_role NOT NULL DEFAULT 'member',
    team_id uuid,
    total_points integer NOT NULL DEFAULT 0,
    avatar_url text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.users
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email text;

UPDATE public.users
SET email = concat('user-', gen_random_uuid(), '@example.com')
WHERE email IS NULL;

ALTER TABLE public.users
ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users (email);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash text;

ALTER TABLE public.users
ALTER COLUMN password_hash SET DEFAULT '';

UPDATE public.users
SET password_hash = coalesce(password_hash, '')
WHERE password_hash IS NULL;

ALTER TABLE public.users
ALTER COLUMN password_hash SET NOT NULL;

ALTER TABLE public.users
ALTER COLUMN password_hash DROP DEFAULT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.users
ALTER COLUMN display_name SET DEFAULT '';

UPDATE public.users
SET display_name = coalesce(display_name, '')
WHERE display_name IS NULL;

ALTER TABLE public.users
ALTER COLUMN display_name SET NOT NULL;

ALTER TABLE public.users
ALTER COLUMN display_name DROP DEFAULT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role public.user_role;

UPDATE public.users
SET role = 'member'::public.user_role
WHERE role IS NULL;

ALTER TABLE public.users
ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;

ALTER TABLE public.users
ALTER COLUMN role SET DEFAULT 'member';

ALTER TABLE public.users
ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS team_id uuid;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS total_points integer DEFAULT 0;

UPDATE public.users
SET total_points = 0
WHERE total_points IS NULL;

ALTER TABLE public.users
ALTER COLUMN total_points SET DEFAULT 0;

ALTER TABLE public.users
ALTER COLUMN total_points SET NOT NULL;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.users
ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.users
ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'users_team_id_fkey'
			AND conrelid = 'public.users'::regclass
	) THEN
		ALTER TABLE public.users
		ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
	END IF;
END
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Boards -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.boards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    team_id uuid NOT NULL,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.boards
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS name text;

UPDATE public.boards
SET name = coalesce(name, '')
WHERE name IS NULL;

ALTER TABLE public.boards
ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS team_id uuid;

ALTER TABLE public.boards
ALTER COLUMN team_id SET NOT NULL;

ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.boards
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.boards
ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.boards
ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'boards_team_id_fkey'
			AND conrelid = 'public.boards'::regclass
	) THEN
		ALTER TABLE public.boards
		ADD CONSTRAINT boards_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'boards_created_by_fkey'
			AND conrelid = 'public.boards'::regclass
	) THEN
		ALTER TABLE public.boards
		ADD CONSTRAINT boards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
	END IF;
END
$$;

CREATE INDEX IF NOT EXISTS boards_team_id_idx ON public.boards (team_id);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards FORCE ROW LEVEL SECURITY;

-- Lists --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id uuid NOT NULL,
    name text NOT NULL,
    position integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.lists
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.lists
ADD COLUMN IF NOT EXISTS board_id uuid;

ALTER TABLE public.lists
ALTER COLUMN board_id SET NOT NULL;

ALTER TABLE public.lists
ADD COLUMN IF NOT EXISTS name text;

UPDATE public.lists
SET name = coalesce(name, '')
WHERE name IS NULL;

ALTER TABLE public.lists
ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.lists
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

UPDATE public.lists
SET position = coalesce(position, 0)
WHERE position IS NULL;

ALTER TABLE public.lists
ALTER COLUMN position SET NOT NULL;

ALTER TABLE public.lists
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.lists
ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.lists
ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'lists_board_id_fkey'
			AND conrelid = 'public.lists'::regclass
	) THEN
		ALTER TABLE public.lists
		ADD CONSTRAINT lists_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;
	END IF;
END
$$;

CREATE INDEX IF NOT EXISTS lists_board_id_idx ON public.lists (board_id);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists FORCE ROW LEVEL SECURITY;

-- Tasks --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    story_points integer NOT NULL DEFAULT 1,
    assigned_to uuid,
    position integer NOT NULL,
    due_date timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.tasks
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS list_id uuid;

ALTER TABLE public.tasks
ALTER COLUMN list_id SET NOT NULL;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS title text;

UPDATE public.tasks
SET title = coalesce(title, '')
WHERE title IS NULL;

ALTER TABLE public.tasks
ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS story_points integer DEFAULT 1;

UPDATE public.tasks
SET story_points = coalesce(story_points, 1)
WHERE story_points IS NULL;

ALTER TABLE public.tasks
ALTER COLUMN story_points SET DEFAULT 1;

ALTER TABLE public.tasks
ALTER COLUMN story_points SET NOT NULL;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assigned_to uuid;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

UPDATE public.tasks
SET position = coalesce(position, 0)
WHERE position IS NULL;

ALTER TABLE public.tasks
ALTER COLUMN position SET NOT NULL;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS due_date timestamptz;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.tasks
ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.tasks
ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'tasks_list_id_fkey'
			AND conrelid = 'public.tasks'::regclass
	) THEN
		ALTER TABLE public.tasks
		ADD CONSTRAINT tasks_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'tasks_assigned_to_fkey'
			AND conrelid = 'public.tasks'::regclass
	) THEN
		ALTER TABLE public.tasks
		ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
	END IF;
END
$$;

CREATE INDEX IF NOT EXISTS tasks_list_id_idx ON public.tasks (list_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

-- Points history -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.points_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    points_earned integer NOT NULL,
    reason public.points_reason NOT NULL,
    task_id uuid,
    awarded_by uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.points_history
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.points_history
ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.points_history
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.points_history
ADD COLUMN IF NOT EXISTS points_earned integer DEFAULT 0;

UPDATE public.points_history
SET points_earned = coalesce(points_earned, 0)
WHERE points_earned IS NULL;

ALTER TABLE public.points_history
ALTER COLUMN points_earned SET NOT NULL;

ALTER TABLE public.points_history
ADD COLUMN IF NOT EXISTS reason public.points_reason;

UPDATE public.points_history
SET reason = 'task_complete'::public.points_reason
WHERE reason IS NULL;

ALTER TABLE public.points_history
ALTER COLUMN reason TYPE public.points_reason USING reason::text::public.points_reason;

ALTER TABLE public.points_history
ALTER COLUMN reason SET NOT NULL;

ALTER TABLE public.points_history
ADD COLUMN IF NOT EXISTS task_id uuid;

ALTER TABLE public.points_history
ADD COLUMN IF NOT EXISTS awarded_by uuid;

ALTER TABLE public.points_history
ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.points_history
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

ALTER TABLE public.points_history
ALTER COLUMN created_at SET DEFAULT timezone('utc', now());

ALTER TABLE public.points_history
ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'points_history_user_id_fkey'
			AND conrelid = 'public.points_history'::regclass
	) THEN
		ALTER TABLE public.points_history
		ADD CONSTRAINT points_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'points_history_task_id_fkey'
			AND conrelid = 'public.points_history'::regclass
	) THEN
		ALTER TABLE public.points_history
		ADD CONSTRAINT points_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'points_history_awarded_by_fkey'
			AND conrelid = 'public.points_history'::regclass
	) THEN
		ALTER TABLE public.points_history
		ADD CONSTRAINT points_history_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES public.users(id) ON DELETE SET NULL;
	END IF;
END
$$;

CREATE INDEX IF NOT EXISTS points_history_user_id_idx ON public.points_history (user_id);

ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history FORCE ROW LEVEL SECURITY;

-- RLS policies -------------------------------------------------------------

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
