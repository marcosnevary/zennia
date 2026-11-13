-- Learn is now lessons that add their list to practice, so the guided schedule's data goes. The words only Learn
-- brought become the user's, active and tagged like the words the N5 lesson adds.
-- Guarded so it can run again: it may be applied by hand in the SQL editor before the merge, and the Supabase
-- integration runs it again on main.
do $$
begin
  if exists (
    select from information_schema.columns
    where table_schema = 'public' and table_name = 'words' and column_name = 'mine'
  ) then
    update public.words
    set
      tags = case
        when exists (select from unnest(tags) t where lower(t) = 'jlpt-n5') then tags
        else array_append(tags, 'JLPT-N5')
      end,
      activated_at = case when disabled then now() else activated_at end,
      disabled = false
    where not mine;
  end if;
end $$;

alter table public.words drop column if exists mine;
alter table public.settings drop column if exists practice_mode;
drop table if exists public.list_progress;
