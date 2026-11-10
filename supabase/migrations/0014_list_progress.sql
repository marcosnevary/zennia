-- "if not exists": the table and the column are added by hand in the SQL editor before the merge, and the Supabase integration runs this again on main
create table if not exists public.list_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  item text not null,
  state text not null check (state in ('learning', 'known')),
  streak integer not null default 0 check (streak >= 0),
  introduced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item)
);

alter table public.list_progress enable row level security;

drop policy if exists "own rows" on public.list_progress;
create policy "own rows" on public.list_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.settings
  add column if not exists practice_mode text not null default 'learn' check (practice_mode in ('learn', 'free'));
