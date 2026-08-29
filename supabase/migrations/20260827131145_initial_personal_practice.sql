create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  daily_goal_minutes integer not null default 15 check (daily_goal_minutes between 5 and 240),
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practiced_on date not null default current_date,
  minutes integer not null check (minutes between 1 and 480),
  source text not null default 'manual' check (source in ('manual', 'exercise', 'song')),
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_user_day_idx
  on public.practice_sessions (user_id, practiced_on desc);

alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;

revoke all on public.profiles from anon;
revoke all on public.practice_sessions from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.practice_sessions to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "practice_sessions_select_own" on public.practice_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "practice_sessions_insert_own" on public.practice_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "practice_sessions_update_own" on public.practice_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "practice_sessions_delete_own" on public.practice_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);
