-- Principal invite / registration / approval flow cleanup.
-- Allows minimal principal invite rows and a non-active teacher status while password setup is pending.

do $$
declare
  target_column text;
begin
  foreach target_column in array array[
    'phone',
    'full_name_mm',
    'full_name_en',
    'date_of_birth',
    'gender',
    'nrc_number',
    'residential_address',
    'state_region_id',
    'township_id',
    'nrc_front_url',
    'nrc_back_url',
    'degree_certificate_url',
    'teaching_license_url',
    'highest_education',
    'years_of_teaching_experience',
    'years_of_management_experience'
  ]
  loop
    if exists (
      select 1
      from information_schema.columns as c
      where c.table_schema = 'public'
        and c.table_name = 'registration_requests'
        and c.column_name = target_column
    ) then
      execute format(
        'alter table public.registration_requests alter column %I drop not null',
        target_column
      );
    end if;
  end loop;
end $$;

alter table public.registration_requests
  add column if not exists current_step integer not null default 0,
  add column if not exists draft_saved_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists final_confirmed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id),
  add column if not exists cancellation_reason text,
  add column if not exists invite_resent_at timestamptz,
  add column if not exists invite_resent_count integer not null default 0,
  add column if not exists invite_note text;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.registration_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.registration_requests drop constraint %I', constraint_record.conname);
  end loop;
end $$;

alter table public.registration_requests
  add constraint registration_requests_status_check
  check (status in ('invited', 'draft', 'pending', 'approved', 'rejected', 'cancelled'));

alter table public.teachers
  add column if not exists status text default 'active',
  add column if not exists updated_at timestamptz;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.teachers'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.teachers drop constraint %I', constraint_record.conname);
  end loop;
end $$;

alter table public.teachers
  add constraint teachers_status_check
  check (
    status is null
    or status in (
      'active',
      'inactive',
      'invited',
      'pending',
      'pending_password',
      'approved',
      'rejected',
      'suspended',
      'archived'
    )
  );

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', constraint_record.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'school_admin', 'principal', 'teacher', 'guardian', 'student'));

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'registration_requests_one_active_principal_flow_per_school'
  ) then
    if not exists (
      select approved_school_id
      from public.registration_requests
      where request_type = 'principal'
        and approved_school_id is not null
        and status in ('invited', 'draft', 'pending', 'approved')
      group by approved_school_id
      having count(*) > 1
    ) then
      create unique index registration_requests_one_active_principal_flow_per_school
        on public.registration_requests (approved_school_id)
        where request_type = 'principal'
          and approved_school_id is not null
          and status in ('invited', 'draft', 'pending', 'approved');
    else
      raise notice 'Skipped registration_requests_one_active_principal_flow_per_school because duplicate active Principal flows exist.';
    end if;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'registration_requests_one_active_principal_email_per_school'
  ) then
    if not exists (
      select approved_school_id, lower(email)
      from public.registration_requests
      where request_type = 'principal'
        and approved_school_id is not null
        and nullif(btrim(coalesce(email, '')), '') is not null
        and status in ('invited', 'draft', 'pending', 'approved')
      group by approved_school_id, lower(email)
      having count(*) > 1
    ) then
      create unique index registration_requests_one_active_principal_email_per_school
        on public.registration_requests (approved_school_id, lower(email))
        where request_type = 'principal'
          and approved_school_id is not null
          and nullif(btrim(coalesce(email, '')), '') is not null
          and status in ('invited', 'draft', 'pending', 'approved');
    else
      raise notice 'Skipped registration_requests_one_active_principal_email_per_school because duplicate active Principal email flows exist.';
    end if;
  end if;
end $$;
