
-- Enable extension for UUID generation (usually enabled by default)
create extension if not exists "pgcrypto" with schema public;

-- 1) Enum for question difficulty
do $$
begin
  if not exists (select 1 from pg_type where typname = 'difficulty_level') then
    create type public.difficulty_level as enum ('easy', 'moderate', 'difficult');
  end if;
end$$;

-- 2) Profiles table (user-facing metadata; do NOT attach triggers to auth.users)
create table if not exists public.profiles (
  id uuid primary key, -- equals auth.users.id
  name text,
  email text unique,
  streak integer not null default 0,
  difficulty_ratio jsonb not null default jsonb_build_object('easy',0.8,'moderate',0.2,'difficult',0.0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- RLS: a user can only see/update their own profile; allow insert for self (app will create on first login)
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 3) Questions (teacher-managed via dashboard/CSV)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  difficulty public.difficulty_level not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer char(1) not null,
  reasoning text,
  created_at timestamptz not null default now(),
  constraint correct_answer_valid check (upper(correct_answer) in ('A','B','C','D'))
);

create index if not exists idx_questions_difficulty on public.questions(difficulty);
create index if not exists idx_questions_subject on public.questions(subject);

alter table public.questions enable row level security;

-- RLS: authenticated users can read questions; write access not granted (managed via dashboard/service role)
drop policy if exists "questions_read_auth" on public.questions;
create policy "questions_read_auth"
on public.questions for select
to authenticated
using (true);

-- 4) User answers (per-attempt logging)
create table if not exists public.user_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  chosen_answer char(1) not null,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  constraint chosen_answer_valid check (upper(chosen_answer) in ('A','B','C','D'))
);

create index if not exists idx_user_answers_user_id on public.user_answers(user_id);
create index if not exists idx_user_answers_question_id on public.user_answers(question_id);
create index if not exists idx_user_answers_answered_at on public.user_answers(answered_at);

alter table public.user_answers enable row level security;

-- RLS: users may insert/read/update/delete only their own answers
drop policy if exists "user_answers_select_own" on public.user_answers;
drop policy if exists "user_answers_insert_own" on public.user_answers;
drop policy if exists "user_answers_update_own" on public.user_answers;
drop policy if exists "user_answers_delete_own" on public.user_answers;

create policy "user_answers_select_own"
on public.user_answers for select
to authenticated
using (user_id = auth.uid());

create policy "user_answers_insert_own"
on public.user_answers for insert
to authenticated
with check (user_id = auth.uid());

create policy "user_answers_update_own"
on public.user_answers for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "user_answers_delete_own"
on public.user_answers for delete
to authenticated
using (user_id = auth.uid());

-- 5) Daily stats (per day rollup)
create table if not exists public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  questions_attempted integer not null default 0,
  questions_correct integer not null default 0,
  accuracy numeric(5,2) not null default 0, -- 0.00..100.00
  streak integer not null default 0,
  difficulty_ratio jsonb not null default jsonb_build_object('easy',0.8,'moderate',0.2,'difficult',0.0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_stats_user_date_unique unique (user_id, date)
);

create index if not exists idx_daily_stats_user_date on public.daily_stats(user_id, date);

drop trigger if exists daily_stats_set_updated_at on public.daily_stats;
create trigger daily_stats_set_updated_at
before update on public.daily_stats
for each row execute function public.set_updated_at();

alter table public.daily_stats enable row level security;

-- RLS: users manage only their own daily stats
drop policy if exists "daily_stats_select_own" on public.daily_stats;
drop policy if exists "daily_stats_insert_own" on public.daily_stats;
drop policy if exists "daily_stats_update_own" on public.daily_stats;

create policy "daily_stats_select_own"
on public.daily_stats for select
to authenticated
using (user_id = auth.uid());

create policy "daily_stats_insert_own"
on public.daily_stats for insert
to authenticated
with check (user_id = auth.uid());

create policy "daily_stats_update_own"
on public.daily_stats for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 6) Activity log (immutable by default)
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  details jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists idx_activity_log_user_ts on public.activity_log(user_id, timestamp);

alter table public.activity_log enable row level security;

-- RLS: users can read their own logs; can insert their own; no updates/deletes (immutable)
drop policy if exists "activity_log_select_own" on public.activity_log;
drop policy if exists "activity_log_insert_own" on public.activity_log;

create policy "activity_log_select_own"
on public.activity_log for select
to authenticated
using (user_id = auth.uid());

create policy "activity_log_insert_own"
on public.activity_log for insert
to authenticated
with check (user_id = auth.uid());

-- 7) Realtime (optional – helpful for live progress/UI)
-- Ensure full row data for updates
alter table public.user_answers replica identity full;
alter table public.daily_stats replica identity full;
alter table public.activity_log replica identity full;

-- Add tables to the realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.user_answers;
    alter publication supabase_realtime add table public.daily_stats;
    alter publication supabase_realtime add table public.activity_log;
  end if;
end$$;
