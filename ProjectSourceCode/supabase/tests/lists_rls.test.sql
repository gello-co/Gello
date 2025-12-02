-- pgTAP tests for lists RLS policies
-- Reference: https://supabase.com/docs/guides/local-development/testing

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- Seed data
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
    'dddddddd-dddd-dddd-dddd-ddddddddddd4'
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

-- Test 1: Admin can insert list on any board
set local role authenticated;
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';
select lives_ok(
    $$
    insert into public.lists (board_id, name, position)
    values ('55555555-5555-5555-5555-555555555555', 'Admin List', 2)
    $$,
    'Admins can insert lists anywhere'
);

-- Test 2: Manager can insert list on their board
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select lives_ok(
    $$
    insert into public.lists (board_id, name, position)
    values ('44444444-4444-4444-4444-444444444444', 'Manager Alpha List', 2)
    $$,
    'Managers can insert lists for their team boards'
);

-- Test 3: Manager cannot insert list on another team's board
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select throws_like(
    $$
    insert into public.lists (board_id, name, position)
    values ('55555555-5555-5555-5555-555555555555', 'Illegal List', 2)
    $$,
    'new row violates row-level security policy%',
    'Managers cannot insert lists for other teams'
);

-- Test 4: Member can read lists linked to their team
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select lives_ok(
    $$
    select *
    from public.lists
    where id = '66666666-6666-6666-6666-666666666666'
    $$,
    'Members can read lists for their team'
);

-- Test 5: Member cannot read lists from other teams
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select is(
    (
        select count(*)::int
        from public.lists
        where id = '77777777-7777-7777-7777-777777777777'
    ),
    0,
    'Members cannot read lists outside their team'
);

select * from finish();
rollback;
