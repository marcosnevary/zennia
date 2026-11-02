-- "if not exists": the column is added by hand in the SQL editor before the merge, and the Supabase integration runs it again on main
alter table public.settings
  add column if not exists number_key_tabs boolean not null default true;
