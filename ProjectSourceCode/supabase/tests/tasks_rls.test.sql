-- pgTAP tests for tasks RLS policies
-- Reference: https://supabase.com/docs/guides/local-development/testing

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- Seed data
delete from public.tasks
where id in (
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaa6'
);

delete from public.lists
where id in (
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777'
);

delete from public.boards
where id in (
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
);

delete from public.users
where id in (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'cccccccc-cccc-cccc-cccc-ccccccccccc3',
    'dddddddd-dddd-dddd-dddd-ddddddddddd4',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5'
);

delete from public.teams
where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
);

insert into public.teams (id, name)
values
('11111111-1111-1111-1111-111111111111', 'Alpha Team'),
('22222222-2222-2222-2222-222222222222', 'Beta Team');

insert into public.users (id, email, password_hash, display_name, role, team_id)
values
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'manager-a@test.local',
    'hash',
    'Manager A',
    'manager',
    '11111111-1111-1111-1111-111111111111'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'manager-b@test.local',
    'hash',
    'Manager B',
    'manager',
    '22222222-2222-2222-2222-222222222222'
),
(
    'cccccccc-cccc-cccc-cccc-ccccccccccc3',
    'member@test.local',
    'hash',
    'Member',
    'member',
    '11111111-1111-1111-1111-111111111111'
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd4',
    'admin@test.local',
    'hash',
    'Admin',
    'admin',
    null
),
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5',
    'member-b@test.local',
    'hash',
    'Member B',
    'member',
    '22222222-2222-2222-2222-222222222222'
);

insert into public.boards (id, name, description, team_id, created_by)
values
(
    '44444444-4444-4444-4444-444444444444',
    'Alpha Board',
    'Board for team alpha',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
),
(
    '55555555-5555-5555-5555-555555555555',
    'Beta Board',
    'Board for team beta',
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
);

insert into public.lists (id, board_id, name, position)
values
(
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    'Alpha List',
    1
),
(
    '77777777-7777-7777-7777-777777777777',
    '55555555-5555-5555-5555-555555555555',
    'Beta List',
    1
);

insert into public.tasks (
    id, list_id, title, description, story_points, assigned_to, position
)
values
(
    '88888888-8888-8888-8888-888888888888',
    '66666666-6666-6666-6666-666666666666',
    'Alpha Task',
    'Task for alpha team',
    3,
    'cccccccc-cccc-cccc-cccc-ccccccccccc3',
    1
),
(
    '99999999-9999-9999-9999-999999999999',
    '77777777-7777-7777-7777-777777777777',
    'Beta Task',
    'Task for beta team',
    2,
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5',
    1
),
(
    'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    '77777777-7777-7777-7777-777777777777',
    'Cross Assignment Task',
    'Task assigned to alpha member on beta board',
    5,
    'cccccccc-cccc-cccc-cccc-ccccccccccc3',
    2
);

-- Test 1: Admin can insert tasks anywhere
set local role authenticated;
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';
select lives_ok(
    $$
    insert into public.tasks (list_id, title, story_points, position)
    values ('77777777-7777-7777-7777-777777777777', 'Admin Task', 1, 3)
    $$,
    'Admins can insert tasks anywhere'
);

-- Test 2: Manager can insert task for their list
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select lives_ok(
    $$
    insert into public.tasks (list_id, title, story_points, position)
    values ('66666666-6666-6666-6666-666666666666', 'Manager Alpha Task', 2, 2)
    $$,
    'Managers can insert tasks for their team'
);

-- Test 3: Manager cannot insert task for other team lists
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select throws_like(
    $$
    insert into public.tasks (list_id, title, story_points, position)
    values ('77777777-7777-7777-7777-777777777777', 'Illegal Task', 1, 3)
    $$,
    'new row violates row-level security policy%',
    'Managers cannot insert tasks outside their team'
);

-- Test 4: Member can read tasks for their team
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select lives_ok(
    $$
    select *
    from public.tasks
    where id = '88888888-8888-8888-8888-888888888888'
    $$,
    'Members can read tasks for their team'
);

-- Test 5: Member can read assigned tasks on other teams
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select lives_ok(
    $$
    select *
    from public.tasks
    where id = 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaa6'
    $$,
    'Members can read tasks assigned to them regardless of team'
);

-- Test 6: Member cannot read unassigned tasks from other teams
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select is(
    (
        select count(*)::int
        from public.tasks
        where id = '99999999-9999-9999-9999-999999999999'
    ),
    0,
    'Members cannot read unrelated tasks outside their team'
);

select * from finish();
rollback;
