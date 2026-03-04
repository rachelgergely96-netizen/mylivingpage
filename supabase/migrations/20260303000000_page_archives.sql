-- Page archives: stores snapshots of pages before each edit
CREATE TABLE public.page_archives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_data jsonb NOT NULL,
  theme_id text NOT NULL,
  slug text NOT NULL,
  archived_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_page_archives_page_id ON public.page_archives(page_id);
CREATE INDEX idx_page_archives_owner_id ON public.page_archives(owner_id);

ALTER TABLE public.page_archives ENABLE ROW LEVEL SECURITY;

-- Owner can read their own archives
CREATE POLICY "archives_select_owner" ON public.page_archives
  FOR SELECT USING (owner_id = auth.uid());

-- Service-role inserts archives (via API); allow all for insert
CREATE POLICY "archives_insert_service" ON public.page_archives
  FOR INSERT WITH CHECK (true);

-- Owner can delete their own archives
CREATE POLICY "archives_delete_owner" ON public.page_archives
  FOR DELETE USING (owner_id = auth.uid());
