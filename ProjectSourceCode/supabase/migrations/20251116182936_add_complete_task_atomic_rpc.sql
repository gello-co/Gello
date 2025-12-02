-- RPC function for atomic task completion
-- Sets completed_at using database timestamp (timezone('utc', now()))
-- Returns the updated task record

create or replace function public.complete_task_atomic(
    p_task_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_task_record public.tasks;
begin
  -- Update task with database-side timestamp
  update public.tasks
  set completed_at = timezone('utc', now())
  where id = p_task_id
  returning * into v_task_record;

  -- Check if task was found and updated
  if v_task_record.id is null then
    raise exception 'Task not found: %', p_task_id;
  end if;

  -- Return the updated record as JSONB
  return to_jsonb(v_task_record);
end;
$$;
