-- Every word now has an activation time; words from before it was tracked take the time they were created.
update public.words set activated_at = created_at where activated_at is null;
alter table public.words alter column activated_at set not null;
