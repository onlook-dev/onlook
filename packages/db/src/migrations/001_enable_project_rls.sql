ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can create their own projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (true); -- The association with user is handled in the userProjects table

CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

ALTER TABLE IF EXISTS public.user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own user_projects entries"
ON public.user_projects
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

CREATE POLICY "Users can create their own user_projects entries"
ON public.user_projects
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE POLICY "Users can delete their own user_projects entries"
ON public.user_projects
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

ALTER TABLE IF EXISTS public.canvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own canvases"
ON public.canvas
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can create their own canvases"
ON public.canvas
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can update their own canvases"
ON public.canvas
FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can delete their own canvases"
ON public.canvas
FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

ALTER TABLE IF EXISTS public.frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own frames"
ON public.frames
FOR SELECT
TO authenticated
USING (
  canvas_id IN (
    SELECT id
    FROM public.canvas
    WHERE project_id IN (
      SELECT project_id
      FROM public.user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Users can create their own frames"
ON public.frames
FOR INSERT
TO authenticated
WITH CHECK (
  canvas_id IN (
    SELECT id
    FROM public.canvas
    WHERE project_id IN (
      SELECT project_id
      FROM public.user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Users can update their own frames"
ON public.frames
FOR UPDATE
TO authenticated
USING (
  canvas_id IN (
    SELECT id
    FROM public.canvas
    WHERE project_id IN (
      SELECT project_id
      FROM public.user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Users can delete their own frames"
ON public.frames
FOR DELETE
TO authenticated
USING (
  canvas_id IN (
    SELECT id
    FROM public.canvas
    WHERE project_id IN (
      SELECT project_id
      FROM public.user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can create conversations for their own projects"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can update their own conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can delete their own conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT project_id
    FROM public.user_projects
    WHERE user_id = (SELECT auth.uid())
  )
);

ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id
    FROM public.conversations
    WHERE project_id IN (
      SELECT project_id
      FROM public.user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Users can create messages in their own conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id
    FROM public.conversations
    WHERE project_id IN (
      SELECT project_id
      FROM public.user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT id
    FROM public.conversations
    WHERE project_id IN (
      SELECT project_id
      FROM public.user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  conversation_id IN (
    SELECT id
    FROM public.conversations
    WHERE project_id IN (
      SELECT project_id
      FROM public.user_projects
      WHERE user_id = (SELECT auth.uid())
    )
  )
);
