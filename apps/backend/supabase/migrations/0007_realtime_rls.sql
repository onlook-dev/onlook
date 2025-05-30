create or replace function public.project_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  topic_project_id uuid;
begin
  IF TG_TABLE_NAME = 'frames' THEN
    SELECT c.project_id INTO topic_project_id
    FROM "frames" f INNER JOIN "canvas" c ON f.canvas_id = c.id
    WHERE f.id = coalesce(NEW.id, OLD.id);
  ELSEIF TG_TABLE_NAME = 'user_canvases' THEN
    SELECT c.project_id INTO topic_project_id
    FROM "user_canvases" uc INNER JOIN "canvas" c ON uc.canvas_id = c.id
    WHERE uc.id = coalesce(NEW.id, OLD.id);
  ELSEIF TG_TABLE_NAME = 'canvas' THEN
    SELECT p.id INTO topic_project_id
    FROM "canvas" c INNER JOIN "projects" p ON c.project_id = p.id
    WHERE c.id = coalesce(NEW.id, OLD.id);
  ELSEIF TG_TABLE_NAME = 'projects' THEN
    topic_project_id := coalesce(NEW.id, OLD.id);
  END IF;

  -- Only broadcast if we found a valid project_id (i.e., not for projects table)
  IF topic_project_id IS NOT NULL THEN
    perform realtime.broadcast_changes(
      'topic:' || topic_project_id::text, -- topic - the topic to which we're broadcasting
      TG_OP,                                             -- event - the event that triggered the function
      TG_OP,                                             -- operation - the operation that triggered the function
      TG_TABLE_NAME,                                     -- table - the table that caused the trigger
      TG_TABLE_SCHEMA,                                   -- schema - the schema of the table that caused the trigger
      NEW,                                               -- new record - the record after the change
      OLD                                                -- old record - the record before the change
    );
  END IF;
  return null;
end;
$$;

drop trigger if exists handle_canvas_changes on public.canvas;
create trigger handle_canvas_changes
after insert or update or delete
on public.canvas
for each row
execute function project_changes ();

drop trigger if exists handle_frames_changes on public.frames;
create trigger handle_frames_changes
after insert or update or delete
on public.frames
for each row
execute function project_changes ();

drop trigger if exists handle_user_canvases_changes on public.user_canvases;
create trigger handle_user_canvases_changes
after insert or update or delete
on public.user_canvases
for each row
execute function project_changes ();

drop policy if exists "Authenticated users can receive broadcasts" on "realtime"."messages";
create policy "Authenticated users can receive broadcasts"
on "realtime"."messages"
for select
to authenticated
using ( true );