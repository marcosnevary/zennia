-- "if not exists": the column is added by hand in the SQL editor before the merge, and the Supabase integration runs it again on main
alter table public.settings
  add column if not exists play_answer_sound boolean not null default true;
