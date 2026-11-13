-- The practice draw keeps a memory per item (docs/practice-draw.md), and every answer is logged so a future model
-- can be rebuilt from the history. Guarded so it can run again: it is applied by hand in the SQL editor before the
-- merge, and the Supabase integration runs it again on main.

-- Null until the item is answered under this model, so items with only a tally start as new.
alter table public.word_stats
  add column if not exists half_life_ms bigint check (half_life_ms > 0),
  add column if not exists answered_at timestamptz,
  add column if not exists streak integer not null default 0 check (streak >= 0);

alter table public.kana_stats
  add column if not exists half_life_ms bigint check (half_life_ms > 0),
  add column if not exists answered_at timestamptz,
  add column if not exists streak integer not null default 0 check (streak >= 0);

create table if not exists public.word_answers (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  word_id text not null,
  hit boolean not null,
  answered_at timestamptz not null default now(),
  foreign key (user_id, word_id) references public.words (user_id, id) on delete cascade
);

create table if not exists public.kana_answers (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  script text not null check (script in ('hiragana', 'katakana')),
  hiragana text not null,
  hit boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists word_answers_user_word on public.word_answers (user_id, word_id);
create index if not exists kana_answers_user on public.kana_answers (user_id);

alter table public.word_answers enable row level security;
alter table public.kana_answers enable row level security;

drop policy if exists "own rows" on public.word_answers;
create policy "own rows" on public.word_answers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own rows" on public.kana_answers;
create policy "own rows" on public.kana_answers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The memory is computed in the app (src/lib/data/memory.ts), so the rule lives in one place; the tally is still
-- counted here, so two tabs or devices never overwrite each other's counts.
drop function if exists public.record_answer(text, text, boolean);

create or replace function public.record_answer(
  p_kind text,
  p_key text,
  p_hit boolean,
  p_half_life_ms bigint,
  p_streak integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_script text := split_part(p_key, ':', 1);
  v_hiragana text := substr(p_key, position(':' in p_key) + 1);
begin
  if p_kind = 'word' then
    insert into public.word_stats (user_id, word_id, hits, misses, half_life_ms, answered_at, streak)
    values (auth.uid(), p_key, p_hit::int, (not p_hit)::int, p_half_life_ms, now(), p_streak)
    on conflict (user_id, word_id) do update
      set hits = public.word_stats.hits + excluded.hits,
          misses = public.word_stats.misses + excluded.misses,
          half_life_ms = excluded.half_life_ms,
          answered_at = excluded.answered_at,
          streak = excluded.streak;
    insert into public.word_answers (user_id, word_id, hit) values (auth.uid(), p_key, p_hit);
  elsif p_kind = 'kana' then
    insert into public.kana_stats (user_id, script, hiragana, hits, misses, half_life_ms, answered_at, streak)
    values (auth.uid(), v_script, v_hiragana, p_hit::int, (not p_hit)::int, p_half_life_ms, now(), p_streak)
    on conflict (user_id, script, hiragana) do update
      set hits = public.kana_stats.hits + excluded.hits,
          misses = public.kana_stats.misses + excluded.misses,
          half_life_ms = excluded.half_life_ms,
          answered_at = excluded.answered_at,
          streak = excluded.streak;
    insert into public.kana_answers (user_id, script, hiragana, hit) values (auth.uid(), v_script, v_hiragana, p_hit);
  else
    raise exception 'unknown kind %', p_kind;
  end if;
end;
$$;
