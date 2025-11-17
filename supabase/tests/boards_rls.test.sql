-- pgTAP tests for boards RLS policies
-- Reference: https://supabase.com/docs/guides/local-development/testing

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- Seed data
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

-- Test 1: Admin can insert board for any team
set local role authenticated;
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';
select lives_ok(
    $$
    insert into public.boards (name, description, team_id)
    values ('Admin Board', 'Created by admin', '22222222-2222-2222-2222-222222222222')
    $$,
    'Admins can insert boards for any team'
);

-- Test 2: Manager can insert board for their own team
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select lives_ok(
    $$
    insert into public.boards (name, description, team_id)
    values ('Manager Alpha Board', 'Owned by team alpha', '11111111-1111-1111-1111-111111111111')
    $$,
    'Managers can insert boards for their team'
);

-- Test 3: Manager cannot insert board for another team
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select throws_like(
    $$
    insert into public.boards (name, description, team_id)
    values ('Illegal Board', 'Wrong team', '22222222-2222-2222-2222-222222222222')
    $$,
    'new row violates row-level security policy%',
    'Managers cannot insert boards for other teams'
);

-- Test 4: Member can read boards for their team
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select lives_ok(
    $$
    select *
    from public.boards
    where id = '44444444-4444-4444-4444-444444444444'
    $$,
    'Members can read boards for their team'
);

-- Test 5: Member cannot read boards for other teams
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select is(
    (
        select count(*)::int
        from public.boards
        where id = '55555555-5555-5555-5555-555555555555'
    ),
    0,
    'Members cannot read boards outside their team'
);

select * from finish();
rollback;
