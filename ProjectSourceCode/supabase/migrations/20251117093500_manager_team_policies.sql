-- Allow managers to manage teams and team membership via RLS policies

-- Teams policies ------------------------------------------------------------
DROP POLICY IF EXISTS teams_admin_manage_all ON public.teams;
DROP POLICY IF EXISTS admins_manage_teams ON public.teams;
DROP POLICY IF EXISTS teams_manager_insert ON public.teams;
DROP POLICY IF EXISTS teams_manager_update ON public.teams;

CREATE POLICY teams_admin_manage_all ON public.teams
FOR ALL
USING (public.current_user_role() = 'admin'::public.user_role)
WITH CHECK (public.current_user_role() = 'admin'::public.user_role);

CREATE POLICY teams_manager_insert ON public.teams
FOR INSERT
WITH CHECK (
    public.current_user_role() IN (
        'admin'::public.user_role, 'manager'::public.user_role
    )
);

CREATE POLICY teams_manager_update ON public.teams
FOR UPDATE
USING (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND id = (
            SELECT u.team_id
            FROM public.users AS u
            WHERE u.id = auth.uid()
        )
    )
)
WITH CHECK (
    public.current_user_role() = 'admin'::public.user_role
    OR (
        public.current_user_role() = 'manager'::public.user_role
        AND id = (
            SELECT u.team_id
            FROM public.users AS u
            WHERE u.id = auth.uid()
        )
    )
);

-- Users policies ------------------------------------------------------------
DROP POLICY IF EXISTS managers_view_team_members ON public.users;
DROP POLICY IF EXISTS managers_manage_team_members ON public.users;

CREATE POLICY managers_view_team_members ON public.users
FOR SELECT
USING (
    public.current_user_role() = 'manager'::public.user_role
    AND (
        team_id IS NULL
        OR team_id = (
            SELECT u.team_id
            FROM public.users AS u
            WHERE u.id = auth.uid()
        )
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
            OR team_id = (
                SELECT u.team_id
                FROM public.users AS u
                WHERE u.id = auth.uid()
            )
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
            OR team_id = (
                SELECT u.team_id
                FROM public.users AS u
                WHERE u.id = auth.uid()
            )
        )
    )
);
