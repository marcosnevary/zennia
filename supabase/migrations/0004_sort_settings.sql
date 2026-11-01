alter table public.settings
  add column words_sort text not null default 'japanese'
    check (words_sort in ('list', 'japanese', 'reading', 'meaning', 'status')),
  add column words_sort_direction text not null default 'asc' check (words_sort_direction in ('asc', 'desc')),
  add column stats_sort text not null default 'accuracy' check (stats_sort in ('misses', 'accuracy', 'hits')),
  add column stats_sort_direction text not null default 'desc' check (stats_sort_direction in ('asc', 'desc'));
