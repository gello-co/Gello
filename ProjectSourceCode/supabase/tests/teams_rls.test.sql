-- pgTAP tests for teams RLS policies
-- Reference: https://supabase.com/docs/guides/local-development/testing

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Seed data (clean up in case tests re-run)
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
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);

insert into public.teams (id, name)
values
('11111111-1111-1111-1111-111111111111', 'Alpha Team'),
('22222222-2222-2222-2222-222222222222', 'Beta Team'),
('33333333-3333-3333-3333-333333333333', 'Gamma Team');

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
    null
),
(
    'dddddddd-dddd-dddd-dddd-ddddddddddd4',
    'admin@test.local',
    'hash',
    'Admin',
    'admin',
    null
);

-- Test 1: Admin can create a team
set local role authenticated;
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';
select lives_ok(
    $$ insert into public.teams (name) values ('Admin Created Team') $$,
    'Admins can create teams'
);

-- Test 2: Manager cannot create a new team
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select throws_like(
    $$ insert into public.teams (name) values ('Manager Created Team') $$,
    'new row violates row-level security policy%',
    'Managers cannot create teams outside their assignment'
);

-- Test 3: Member cannot create a team
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select throws_like(
    $$ insert into public.teams (name) values ('Member Created Team') $$,
    'new row violates row-level security policy%',
    'Members cannot create teams'
);

-- Test 4: Manager can update their own team
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select lives_ok(
    $$
    update public.teams
    set name = 'Alpha Team Updated'
    where id = '11111111-1111-1111-1111-111111111111'
    $$,
    'Managers can update their own team'
);

set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select lives_ok(
    $$
    update public.teams
    set name = 'Beta Team Hacked'
    where id = '22222222-2222-2222-2222-222222222222'
    $$,
    'Manager update on another team performs no work'
);

set local role service_role;
select is(
    (
        select name
        from public.teams
        where id = '22222222-2222-2222-2222-222222222222'
    ),
    'Beta Team',
    'Team name remains unchanged when manager updates other teams'
);
set local role authenticated;

-- Test 6: Admin can delete any team
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';
select lives_ok(
    $$
    delete from public.teams
    where id = '33333333-3333-3333-3333-333333333333'
    $$,
    'Admins can delete any team'
);

-- Test 7: Member delete attempts affect zero rows
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select lives_ok(
    $$
    delete from public.teams
    where id = '11111111-1111-1111-1111-111111111111'
    $$,
    'Member delete attempts perform no work'
);

set local role service_role;
select is(
    (
        select count(*)::int
        from public.teams
        where id = '11111111-1111-1111-1111-111111111111'
    ),
    1,
    'Member delete attempts leave their team intact'
);
set local role authenticated;

select * from finish();
rollback;
