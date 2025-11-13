-- Seed data for local development.
-- Establishes a minimal set of teams, users, boards, lists, tasks, and
-- points history entries so the application has meaningful data on first run.
-- Emails are unique to avoid colliding with test fixtures (e.g. admin@test.com).

begin;

truncate table public.points_history restart identity cascade;
truncate table public.tasks restart identity cascade;
truncate table public.lists restart identity cascade;
truncate table public.boards restart identity cascade;
truncate table public.users restart identity cascade;
truncate table public.teams restart identity cascade;

do $$
declare
    v_team uuid;
    v_admin uuid;
    v_manager uuid;
    v_member uuid;
    v_board uuid;
    v_list_backlog uuid;
    v_list_in_progress uuid;
    v_list_done uuid;
    v_task uuid;
begin
    insert into public.teams (name)
    values ('Seed Team Alpha')
    returning id into v_team;

    insert into public.users (
        id,
        email,
        password_hash,
        display_name,
        role,
        team_id,
        total_points,
        avatar_url
    )
    values (
        gen_random_uuid(),
        'seed.admin@example.com',
        '',
        'Seed Admin',
        'admin',
        v_team,
        50,
        null
    )
    returning id into v_admin;

    insert into public.users (
        id,
        email,
        password_hash,
        display_name,
        role,
        team_id,
        total_points,
        avatar_url
    )
    values (
        gen_random_uuid(),
        'seed.manager@example.com',
        '',
        'Seed Manager',
        'manager',
        v_team,
        35,
        null
    )
    returning id into v_manager;

    insert into public.users (
        id,
        email,
        password_hash,
        display_name,
        role,
        team_id,
        total_points,
        avatar_url
    )
    values (
        gen_random_uuid(),
        'seed.member@example.com',
        '',
        'Seed Member',
        'member',
        v_team,
        20,
        null
    )
    returning id into v_member;

    insert into public.boards (name, description, team_id, created_by)
    values (
        'Seed Board',
        'Example board with lists and tasks for local development.',
        v_team,
        v_manager
    )
    returning id into v_board;

    insert into public.lists (board_id, name, position)
    values (v_board, 'Backlog', 0)
    returning id into v_list_backlog;

    insert into public.lists (board_id, name, position)
    values (v_board, 'In Progress', 1)
    returning id into v_list_in_progress;

    insert into public.lists (board_id, name, position)
    values (v_board, 'Done', 2)
    returning id into v_list_done;

    insert into public.tasks (
        list_id,
        title,
        description,
        story_points,
        assigned_to,
        position
    )
    values (
        v_list_in_progress,
        'Seed Task: Build onboarding flow',
        'Demonstration task created by database seed.',
        3,
        v_member,
        0
    )
    returning id into v_task;

    insert into public.points_history (
        user_id,
        points_earned,
        reason,
        task_id,
        awarded_by,
        notes
    )
    values (
        v_member,
        3,
        'task_complete',
        v_task,
        v_admin,
        'Seed data: points awarded for completing the sample task.'
    );
end
$$;

commit;
