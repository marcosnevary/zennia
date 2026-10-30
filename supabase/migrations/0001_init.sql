create table public.words (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  japanese text not null check (btrim(japanese) <> ''),
  hiragana text not null check (btrim(hiragana) <> ''),
  meaning text not null default '',
  disabled boolean not null default false,
  activated_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.word_stats (
  user_id uuid not null default auth.uid(),
  word_id text not null,
  hits integer not null default 0 check (hits >= 0),
  misses integer not null default 0 check (misses >= 0),
  primary key (user_id, word_id),
  foreign key (user_id, word_id) references public.words (user_id, id) on delete cascade
);

create table public.kana_stats (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  script text not null check (script in ('hiragana', 'katakana')),
  hiragana text not null,
  hits integer not null default 0 check (hits >= 0),
  misses integer not null default 0 check (misses >= 0),
  primary key (user_id, script, hiragana)
);

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  words_focus text not null default 'reading' check (words_focus in ('reading', 'meaning', 'both')),
  kana_selection text[]
);

alter table public.words enable row level security;
alter table public.word_stats enable row level security;
alter table public.kana_stats enable row level security;
alter table public.settings enable row level security;

create policy "own rows" on public.words for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.word_stats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.kana_stats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Counts one answer atomically, so two tabs or devices never overwrite each other's tallies.
-- p_kind is 'word' (p_key is the word id) or 'kana' (p_key is "script:hiragana", see kanaKey).
create function public.record_answer(p_kind text, p_key text, p_hit boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_kind = 'word' then
    insert into public.word_stats (user_id, word_id, hits, misses)
    values (auth.uid(), p_key, p_hit::int, (not p_hit)::int)
    on conflict (user_id, word_id) do update
      set hits = public.word_stats.hits + excluded.hits,
          misses = public.word_stats.misses + excluded.misses;
  elsif p_kind = 'kana' then
    insert into public.kana_stats (user_id, script, hiragana, hits, misses)
    values (auth.uid(), split_part(p_key, ':', 1), substr(p_key, position(':' in p_key) + 1), p_hit::int, (not p_hit)::int)
    on conflict (user_id, script, hiragana) do update
      set hits = public.kana_stats.hits + excluded.hits,
          misses = public.kana_stats.misses + excluded.misses;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
end;
$$;
