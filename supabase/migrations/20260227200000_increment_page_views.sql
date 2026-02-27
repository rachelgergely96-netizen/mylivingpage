-- Atomic view counter increment to fix race condition
CREATE OR REPLACE FUNCTION increment_page_views(page_id uuid)
RETURNS void AS $$
  UPDATE pages SET views = views + 1 WHERE id = page_id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;
