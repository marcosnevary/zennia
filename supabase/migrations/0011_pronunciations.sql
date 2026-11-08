-- The audio of each word, made by the pronounce Edge Function, which writes with the service role; anyone can read it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pronunciations', 'pronunciations', true, 262144, '{audio/mpeg}')
on conflict (id) do nothing;

-- "if not exists": the column is added by hand in the SQL editor before the merge, and the Supabase integration runs it again on main
alter table public.settings
  add column if not exists play_pronunciation boolean not null default false;
