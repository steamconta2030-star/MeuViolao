create table if not exists public.chord_calibrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_version integer not null default 1 check (profile_version >= 1),
  samples_per_chord integer not null check (samples_per_chord between 1 and 20),
  signatures jsonb not null constraint chord_calibrations_signatures_shape_check check (
    case
      when jsonb_typeof(signatures) = 'object'
        and signatures ?& array['Em', 'G', 'C', 'D']
        and jsonb_typeof(signatures -> 'Em') = 'array'
        and jsonb_typeof(signatures -> 'G') = 'array'
        and jsonb_typeof(signatures -> 'C') = 'array'
        and jsonb_typeof(signatures -> 'D') = 'array'
      then jsonb_array_length(signatures -> 'Em') = 12
        and jsonb_array_length(signatures -> 'G') = 12
        and jsonb_array_length(signatures -> 'C') = 12
        and jsonb_array_length(signatures -> 'D') = 12
      else false
    end
  ),
  calibrated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chord_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calibration_version integer not null default 1 check (calibration_version >= 1),
  total_tests integer not null check (total_tests > 0),
  correct_tests integer not null constraint chord_diagnostics_correct_tests_range_check
    check (correct_tests between 0 and total_tests),
  accuracy integer not null constraint chord_diagnostics_accuracy_consistency_check check (
    accuracy = round(correct_tests::numeric * 100 / total_tests)::integer
  ),
  results jsonb not null constraint chord_diagnostics_results_shape_check check (
    case
      when jsonb_typeof(results) = 'array'
      then jsonb_array_length(results) = total_tests
      else false
    end
  ),
  created_at timestamptz not null default now()
);

create index if not exists chord_diagnostics_user_created_idx
  on public.chord_diagnostics (user_id, created_at desc);

alter table public.chord_calibrations enable row level security;
alter table public.chord_diagnostics enable row level security;

revoke all on public.chord_calibrations from anon;
revoke all on public.chord_diagnostics from anon;
grant select, insert, update, delete on public.chord_calibrations to authenticated;
grant select, insert on public.chord_diagnostics to authenticated;

drop policy if exists "chord_calibrations_select_own" on public.chord_calibrations;
drop policy if exists "chord_calibrations_insert_own" on public.chord_calibrations;
drop policy if exists "chord_calibrations_update_own" on public.chord_calibrations;
drop policy if exists "chord_calibrations_delete_own" on public.chord_calibrations;
drop policy if exists "chord_diagnostics_select_own" on public.chord_diagnostics;
drop policy if exists "chord_diagnostics_insert_own" on public.chord_diagnostics;

create policy "chord_calibrations_select_own" on public.chord_calibrations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "chord_calibrations_insert_own" on public.chord_calibrations for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "chord_calibrations_update_own" on public.chord_calibrations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "chord_calibrations_delete_own" on public.chord_calibrations for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "chord_diagnostics_select_own" on public.chord_diagnostics for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "chord_diagnostics_insert_own" on public.chord_diagnostics for insert to authenticated
  with check ((select auth.uid()) = user_id);
