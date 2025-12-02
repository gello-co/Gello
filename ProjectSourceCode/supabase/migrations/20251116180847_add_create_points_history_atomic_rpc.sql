-- RPC function for atomic points history creation
-- Inserts points_history record and updates user total_points in a single transaction
-- Returns the created points_history record

create or replace function public.create_points_history_atomic(
    p_user_id uuid,
    p_points_earned integer,
    p_reason public.points_reason,
    p_task_id uuid default null,
    p_awarded_by uuid default null,
    p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_history_record public.points_history;
  v_user_total integer;
begin
  -- Validate user exists
  select total_points into v_user_total
  from public.users
  where id = p_user_id;

  if v_user_total is null then
    raise exception 'User not found: %', p_user_id;
  end if;

  -- Insert points_history record
  insert into public.points_history (
    user_id,
    points_earned,
    reason,
    task_id,
    awarded_by,
    notes
  )
  values (
    p_user_id,
    p_points_earned,
    p_reason,
    p_task_id,
    p_awarded_by,
    p_notes
  )
  returning * into v_history_record;

  -- Update user total_points atomically
  update public.users
  set total_points = coalesce(total_points, 0) + p_points_earned
  where id = p_user_id;

  -- Return the created record as JSONB
  return to_jsonb(v_history_record);
end;
$$;
