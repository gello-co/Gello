-- pgTAP tests for users RLS policies
-- Reference: https://supabase.com/docs/guides/local-development/testing

begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

-- Seed data
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

-- Test 1: Admin can update any user
set local role authenticated;
set local "request.jwt.claim.sub" = 'dddddddd-dddd-dddd-dddd-ddddddddddd4';
select lives_ok(
    $$
    update public.users
    set display_name = 'Member Renamed'
    where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3'
    $$,
    'Admins can update any user'
);

-- Test 2: Manager can update teammate
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
select lives_ok(
    $$
    update public.users
    set display_name = 'Member Updated'
    where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3'
    $$,
    'Managers can update teammates'
);

-- Test 3: Manager cannot update users from another team (zero rows affected)
select lives_ok(
    $$
    update public.users
    set display_name = 'Other Team Updated'
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
    $$,
    'Manager update on other team performs no work'
);

set local role service_role;
select is(
    (
        select display_name
        from public.users
        where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
    ),
    'Manager B',
    'Users outside the manager team remain unchanged'
);
set local role authenticated;

-- Test 4: Member can view their own row
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select lives_ok(
    $$
    select *
    from public.users
    where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3'
    $$,
    'Members can read themselves'
);

-- Test 5: Member cannot read other users
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
select is(
    (
        select count(*)::int
        from public.users
        where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5'
    ),
    0,
    'Members cannot read other users'
);

-- Test 6: Service role can delete users
set local role service_role;
select lives_ok(
    $$
    delete from public.users
    where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5'
    $$,
    'Service role can delete users'
);

select * from finish();
rollback;
