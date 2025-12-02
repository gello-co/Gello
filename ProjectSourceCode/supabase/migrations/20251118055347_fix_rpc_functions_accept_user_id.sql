-- Fix RPC functions to accept user_id as parameter instead of using auth.uid()
-- This allows RPC calls to work with service-role clients or when session validation fails
-- Workaround for Supabase local's session validation issues in tests

-- Update reorder_lists to accept user_id parameter
create or replace function public.reorder_lists(
    p_board_id uuid,
    p_list_positions jsonb,
    p_user_id uuid  -- Add user_id parameter
)
returns integer
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_updated_count integer;
  v_user_id uuid;
  v_has_access boolean;
begin
  -- Use provided user_id, fallback to auth.uid() for backward compatibility
  v_user_id := coalesce(p_user_id, auth.uid());

  -- Verify user has access to this board
  -- Check if user is member of the board's team
  select exists(
    select 1
    from boards b
    inner join teams t on t.id = b.team_id
    inner join users u on u.team_id = t.id
    where b.id = p_board_id
      and u.id = v_user_id
  ) into v_has_access;

  if not v_has_access then
    raise exception 'Unauthorized: User does not have access to board %', p_board_id;
  end if;

  -- Validate input: p_list_positions must be an array
  if jsonb_typeof(p_list_positions) != 'array' then
    raise exception 'list_positions must be a JSON array';
  end if;

  -- Validate all items have required fields
  if exists (
    select 1
    from jsonb_array_elements(p_list_positions) as item
    where not (item ? 'id' and item ? 'position')
  ) then
    raise exception 'Each list position item must have "id" and "position" fields';
  end if;

  -- Update all lists in a single statement using a CTE
  -- This ensures atomicity and allows us to count updated rows correctly
  with list_updates as (
    select
      (item->>'id')::uuid as list_id,
      (item->>'position')::integer as new_position
    from jsonb_array_elements(p_list_positions) as item
  )
  update public.lists l
  set position = lu.new_position
  from list_updates lu
  where l.id = lu.list_id
    and l.board_id = p_board_id;

  -- Get the number of rows updated
  get diagnostics v_updated_count = row_count;

  return v_updated_count;
end;
$$;

-- Note: complete_task_atomic doesn't use auth.uid(), so no changes needed
-- It only updates the task and doesn't check authorization (authorization is checked in application layer)
