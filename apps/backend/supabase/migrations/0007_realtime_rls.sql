CREATE OR REPLACE FUNCTION public.project_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  topic_project_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'conversations' THEN
    SELECT c.project_id INTO topic_project_id
    FROM "conversations" c WHERE c.id = COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'messages' THEN
    SELECT c.project_id INTO topic_project_id
    FROM "messages" m INNER JOIN "conversations" c ON m.conversation_id = c.id
    WHERE m.id = COALESCE(NEW.id, OLD.id);
  END IF;

  -- Only broadcast if we found a valid project_id (i.e., not for projects table)
  IF topic_project_id IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      'topic:' || topic_project_id::text, -- topic - the topic to which we're broadcasting
      TG_OP,                                             -- event - the event that triggered the function
      TG_OP,                                             -- operation - the operation that triggered the function
      TG_TABLE_NAME,                                     -- table - the table that caused the trigger
      TG_TABLE_SCHEMA,                                   -- schema - the schema of the table that caused the trigger
      NEW,                                               -- new record - the record after the change
      OLD                                                -- old record - the record before the change
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS handle_conversations_changes ON public.conversations;
CREATE TRIGGER handle_conversations_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION project_changes ();

DROP TRIGGER IF EXISTS handle_messages_changes ON public.messages;
CREATE TRIGGER handle_messages_changes
AFTER INSERT OR UPDATE OR DELETE
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION project_changes ();

DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON "realtime"."messages";
CREATE POLICY "Authenticated users can receive broadcasts"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING ( TRUE );