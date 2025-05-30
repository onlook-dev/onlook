create or replace function public.project_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  topic_project_id uuid;
begin
  IF TG_TABLE_NAME = 'conversations' THEN
    SELECT c.project_id INTO topic_project_id
    FROM "conversations" c WHERE c.id = coalesce(NEW.id, OLD.id);
  ELSEIF TG_TABLE_NAME = 'messages' THEN
    SELECT c.project_id INTO topic_project_id
    FROM "messages" m INNER JOIN "conversations" c ON m.conversation_id = c.id
    WHERE m.id = coalesce(NEW.id, OLD.id);
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

drop trigger if exists handle_conversations_changes on public.conversations;
create trigger handle_conversations_changes
after insert or update or delete
on public.conversations
for each row
execute function project_changes ();

drop trigger if exists handle_messages_changes on public.messages;
create trigger handle_messages_changes
after insert or update or delete
on public.messages
for each row
execute function project_changes ();

drop policy if exists "Authenticated users can receive broadcasts" on "realtime"."messages";
create policy "Authenticated users can receive broadcasts"
on "realtime"."messages"
for select
to authenticated
using ( true );