create table if not exists public.exercise_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 80),
  best_stars smallint not null check (best_stars between 1 and 3),
  completions integer not null default 1 check (completions >= 1),
  last_completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.exercise_progress enable row level security;

revoke all on public.exercise_progress from anon;
grant select, insert, update on public.exercise_progress to authenticated;

create policy "exercise_progress_select_own" on public.exercise_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "exercise_progress_insert_own" on public.exercise_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "exercise_progress_update_own" on public.exercise_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
