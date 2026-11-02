-- The colour of each tag in use, by its lowercase name: { "<tag>": { "hue": 0-359, "tone": 0-2 } }.
alter table public.settings
  add column tag_colors jsonb not null default '{}';
