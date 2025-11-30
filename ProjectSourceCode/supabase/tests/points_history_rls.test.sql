-- pgTAP tests for points_history RLS policies
-- Reference: https://supabase.com/docs/guides/local-development/testing

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- Seed data
delete from public.points_history
where id in (
    '12121212-1212-1212-1212-121212121212',
    '23232323-2323-2323-2323-232323232323'
);

delete from public.tasks
where id in (
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
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
);

insert into public.points_history (
    id, user_id, points_earned, reason, task_id, awarded_by, notes
)
values
(
    '12121212-1212-1212-1212-121212121212',
    'cccccccc-cccc-cccc-cccc-ccccccccccc3',
    10,
    'task_complete',
    '88888888-8888-8888-8888-888888888888',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Alpha completion'
),
(
    '23232323-2323-2323-2323-232323232323',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5',
    8,
    'manual_award',
    '99999999-9999-9999-9999-999999999999',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'Beta performance'
);

-- Test 1: Admin can insert points for any user
set local role authenticated;
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';
select lives_ok(
    $$
    insert into public.points_history (user_id, points_earned, reason, notes)
    values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5', 5, 'manual_award', 'Admin grant')
    $$,
    'Admins can insert points history'
);

-- Test 2: Manager can insert points for users on their team
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select lives_ok(
    $$
    insert into public.points_history (user_id, points_earned, reason, notes)
    values ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 3, 'manual_award', 'Manager grant')
    $$,
    'Managers can insert points for their team'
);

-- Test 3: Manager cannot insert points for other teams
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select throws_like(
    $$
    insert into public.points_history (user_id, points_earned, reason, notes)
    values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5', 2, 'manual_award', 'Illegal grant')
    $$,
    'new row violates row-level security policy%',
    'Managers cannot insert points for other teams'
);

-- Test 4: Member can read their own points history
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select lives_ok(
    $$
    select *
    from public.points_history
    where user_id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3'
    $$,
    'Members can read their own points history'
);

-- Test 5: Member cannot read other users points history
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select is(
    (
        select count(*)::int
        from public.points_history
        where user_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5'
    ),
    0,
    'Members cannot read other users points history'
);

select * from finish();
rollback;
