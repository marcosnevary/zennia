-- The data rights of the privacy notice (docs/privacy.md). Guarded so it can run again: it is applied by hand in the
-- SQL editor before the merge, and the Supabase integration runs it again on main.

-- Logging answers is a legitimate interest, so users can object to it; practice keeps working without the log.
alter table public.settings
  add column if not exists share_usage_data boolean not null default true;

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
  -- a user with no settings row has the default, which shares
  v_log boolean := coalesce(
    (select s.share_usage_data from public.settings s where s.user_id = auth.uid()),
    true
  );
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
    if v_log then
      insert into public.word_answers (user_id, word_id, hit) values (auth.uid(), p_key, p_hit);
    end if;
  elsif p_kind = 'kana' then
    insert into public.kana_stats (user_id, script, hiragana, hits, misses, half_life_ms, answered_at, streak)
    values (auth.uid(), v_script, v_hiragana, p_hit::int, (not p_hit)::int, p_half_life_ms, now(), p_streak)
    on conflict (user_id, script, hiragana) do update
      set hits = public.kana_stats.hits + excluded.hits,
          misses = public.kana_stats.misses + excluded.misses,
          half_life_ms = excluded.half_life_ms,
          answered_at = excluded.answered_at,
          streak = excluded.streak;
    if v_log then
      insert into public.kana_answers (user_id, script, hiragana, hit) values (auth.uid(), v_script, v_hiragana, p_hit);
    end if;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
end;
$$;

-- Deleting the Auth user cascades to every table of the user. Only the service role can touch auth.users, so the
-- function runs as its owner; it can only ever delete the caller. Storage objects can't be deleted from SQL, so the
-- app removes the profile photo first.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
