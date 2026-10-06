-- Optional: focus/foreground/pull-to-refresh works without this migration.
-- Equivalent to: alter publication supabase_realtime add table public.cart_items;
-- Idempotent for projects where the table is already published.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cart_items') then
    alter publication supabase_realtime add table public.cart_items;
  end if;
end $$;
