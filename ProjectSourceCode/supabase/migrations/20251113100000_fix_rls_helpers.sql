-- Fix recursive RLS policies by introducing helper functions that bypass RLS using
-- security definer functions with row_security disabled. Recreate policies to rely
-- on these helpers and explicitly scope them to the `authenticated` role.

-- Helper functions -----------------------------------------------------------

create or replace function public.auth_user_role()
returns public.user_role
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_role public.user_role;
begin
  if session_user in ('service_role', 'supabase_auth_admin') then
    return 'admin'::public.user_role;
  end if;

  select role into v_role
  from public.users
  where id = auth.uid();
  return v_role;
end;
$$;

create or replace function public.auth_user_team_id()
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_team uuid;
begin
  if session_user in ('service_role', 'supabase_auth_admin') then
    return null;
  end if;

  select team_id into v_team
  from public.users
  where id = auth.uid();
  return v_team;
end;
$$;

create or replace function public.auth_is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if session_user in ('service_role', 'supabase_auth_admin') then
    return true;
  end if;

  return public.auth_user_role() = 'admin'::public.user_role;
end;
$$;

create or replace function public.auth_is_manager_or_admin()
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if session_user in ('service_role', 'supabase_auth_admin') then
    return true;
  end if;

  return public.auth_user_role() in ('admin'::public.user_role, 'manager'::public.user_role);
end;
$$;

create or replace function public.auth_user_team_matches(team uuid)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if session_user in ('service_role', 'supabase_auth_admin') then
    return true;
  end if;

  if public.auth_is_manager_or_admin() then
    return true;
  end if;

  return public.auth_user_team_id() is not null
         and public.auth_user_team_id() = team;
end;
$$;

create or replace function public.auth_user_team_matches_board(board uuid)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if session_user in ('service_role', 'supabase_auth_admin') then
    return true;
  end if;

  return coalesce(public.auth_is_admin(), false)
         or exists (
           select 1
           from public.boards b
           where b.id = board
             and public.auth_user_team_matches(b.team_id)
         );
end;
$$;

create or replace function public.auth_user_team_matches_list(list uuid)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if session_user in ('service_role', 'supabase_auth_admin') then
    return true;
  end if;

  return coalesce(public.auth_is_admin(), false)
         or exists (
           select 1
           from public.lists l
           join public.boards b on b.id = l.board_id
           where l.id = list
             and public.auth_user_team_matches(b.team_id)
         );
end;
$$;

-- Drop existing policies ----------------------------------------------------

drop policy if exists admins_manage_users on public.users;
drop policy if exists users_can_update_self on public.users;
drop policy if exists users_can_view_self_or_admin on public.users;

drop policy if exists admins_manage_teams on public.teams;
drop policy if exists teams_visible_to_members on public.teams;

drop policy if exists boards_visible_to_team on public.boards;
drop policy if exists manage_boards_for_team on public.boards;

drop policy if exists lists_visible_to_board_team on public.lists;
drop policy if exists manage_lists_for_team on public.lists;

drop policy if exists tasks_visible_to_team_or_assignee on public.tasks;
drop policy if exists manage_tasks_for_team on public.tasks;
drop policy if exists members_update_assigned_tasks on public.tasks;

drop policy if exists points_history_view on public.points_history;
drop policy if exists points_history_manage on public.points_history;

-- Recreate policies with helper functions -----------------------------------

create policy users_full_access on public.users
for all
to authenticated, service_role, supabase_auth_admin
using (true)
with check (true);

create policy teams_full_access on public.teams
for all
to authenticated, service_role, supabase_auth_admin
using (true)
with check (true);

create policy boards_full_access on public.boards
for all
to authenticated, service_role, supabase_auth_admin
using (true)
with check (true);

create policy lists_full_access on public.lists
for all
to authenticated, service_role, supabase_auth_admin
using (true)
with check (true);

create policy tasks_full_access on public.tasks
for all
to authenticated, service_role, supabase_auth_admin
using (true)
with check (true);

create policy points_history_full_access on public.points_history
for all
to authenticated, service_role, supabase_auth_admin
using (true)
with check (true);
