-- The log of how zennia is used, kept to improve it (docs/data-model.md#the-usage-log). Guarded so it can run again:
-- it is applied by hand in the SQL editor before the merge, and the Supabase integration runs it again on main.

-- The log outlives the words, so a deleted word's answers stay; it goes only with the account.
alter table public.word_answers drop constraint if exists word_answers_user_id_word_id_fkey;
alter table public.word_answers drop constraint if exists word_answers_user_id_fkey;
alter table public.word_answers
  add constraint word_answers_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table public.word_answers
  add column if not exists verdict text check (verdict in ('correct', 'almost', 'incorrect')),
  add column if not exists focus text check (focus in ('reading', 'meaning', 'both')),
  add column if not exists typed_reading text,
  add column if not exists typed_meaning text,
  add column if not exists response_ms integer,
  add column if not exists result_ms integer,
  add column if not exists hidden boolean,
  add column if not exists p real,
  add column if not exists half_life_ms bigint,
  add column if not exists chance real,
  add column if not exists algorithm smallint,
  add column if not exists session_id uuid,
  add column if not exists seq integer;

alter table public.kana_answers
  add column if not exists verdict text check (verdict in ('correct', 'incorrect')),
  add column if not exists typed_reading text,
  add column if not exists response_ms integer,
  add column if not exists result_ms integer,
  add column if not exists hidden boolean,
  add column if not exists p real,
  add column if not exists half_life_ms bigint,
  add column if not exists chance real,
  add column if not exists algorithm smallint,
  add column if not exists session_id uuid,
  add column if not exists seq integer;

-- `hit` can't tell "almost" from a miss, so the answers logged before become "incorrect"
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'word_answers' and column_name = 'hit'
  ) then
    update public.word_answers set verdict = case when hit then 'correct' else 'incorrect' end;
    alter table public.word_answers drop column hit;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kana_answers' and column_name = 'hit'
  ) then
    update public.kana_answers set verdict = case when hit then 'correct' else 'incorrect' end;
    alter table public.kana_answers drop column hit;
  end if;
end;
$$;

alter table public.word_answers alter column verdict set not null;
alter table public.kana_answers alter column verdict set not null;

-- Next sets result_ms on the answer it closes
create index if not exists word_answers_session on public.word_answers (session_id, seq);
create index if not exists kana_answers_session on public.kana_answers (session_id, seq);

-- Rare events whose shapes vary, so their details go in `payload`
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,
  at timestamptz not null default now(),
  session_id uuid not null,
  payload jsonb not null default '{}'
);

create index if not exists events_user_type on public.events (user_id, type);

alter table public.events enable row level security;

drop policy if exists "own rows" on public.events;
create policy "own rows" on public.events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop function if exists public.record_answer(text, text, boolean, bigint, integer);

create or replace function public.record_answer(
  p_kind text,
  p_key text,
  p_verdict text,
  p_half_life_ms bigint,
  p_streak integer,
  p_p real,
  p_chance real,
  p_algorithm smallint,
  p_session_id uuid,
  p_seq integer,
  p_typed_reading text,
  p_response_ms integer,
  p_hidden boolean,
  p_focus text default null,
  p_typed_meaning text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_script text := split_part(p_key, ':', 1);
  v_hiragana text := substr(p_key, position(':' in p_key) + 1);
  v_hit boolean := p_verdict = 'correct';
  -- a user with no settings row has the default, which shares
  v_log boolean := coalesce(
    (select s.share_usage_data from public.settings s where s.user_id = auth.uid()),
    true
  );
begin
  if p_kind = 'word' then
    insert into public.word_stats (user_id, word_id, hits, misses, half_life_ms, answered_at, streak)
    values (auth.uid(), p_key, v_hit::int, (not v_hit)::int, p_half_life_ms, now(), p_streak)
    on conflict (user_id, word_id) do update
      set hits = public.word_stats.hits + excluded.hits,
          misses = public.word_stats.misses + excluded.misses,
          half_life_ms = excluded.half_life_ms,
          answered_at = excluded.answered_at,
          streak = excluded.streak;
    if v_log then
      insert into public.word_answers (
        user_id, word_id, verdict, focus, typed_reading, typed_meaning, response_ms, hidden, p, half_life_ms, chance,
        algorithm, session_id, seq
      ) values (
        auth.uid(), p_key, p_verdict, p_focus, p_typed_reading, p_typed_meaning, p_response_ms, p_hidden, p_p,
        p_half_life_ms, p_chance, p_algorithm, p_session_id, p_seq
      );
    end if;
  elsif p_kind = 'kana' then
    insert into public.kana_stats (user_id, script, hiragana, hits, misses, half_life_ms, answered_at, streak)
    values (auth.uid(), v_script, v_hiragana, v_hit::int, (not v_hit)::int, p_half_life_ms, now(), p_streak)
    on conflict (user_id, script, hiragana) do update
      set hits = public.kana_stats.hits + excluded.hits,
          misses = public.kana_stats.misses + excluded.misses,
          half_life_ms = excluded.half_life_ms,
          answered_at = excluded.answered_at,
          streak = excluded.streak;
    if v_log then
      insert into public.kana_answers (
        user_id, script, hiragana, verdict, typed_reading, response_ms, hidden, p, half_life_ms, chance, algorithm,
        session_id, seq
      ) values (
        auth.uid(), v_script, v_hiragana, p_verdict, p_typed_reading, p_response_ms, p_hidden, p_p, p_half_life_ms,
        p_chance, p_algorithm, p_session_id, p_seq
      );
    end if;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
end;
$$;
