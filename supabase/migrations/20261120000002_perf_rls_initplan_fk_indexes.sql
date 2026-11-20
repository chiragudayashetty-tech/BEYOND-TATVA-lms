-- Supabase performance advisor fixes (no behaviour change).
-- 1. Evaluate auth.uid() once per query instead of once per row.
alter policy resource_views_own_read on public.resource_views using (student_id = (select auth.uid()));

-- 2. Cover the two foreign keys that had no index.
create index if not exists data_deletions_deleted_by_idx on public.data_deletions (deleted_by);
create index if not exists message_queue_rule_key_idx on public.message_queue (rule_key);
