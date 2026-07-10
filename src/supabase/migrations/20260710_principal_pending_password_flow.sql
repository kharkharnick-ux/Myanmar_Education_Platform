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
    'nrc_front_url',
    'nrc_back_url'
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
  check (status in ('pending', 'approved', 'rejected', 'invited'));

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
  check (role in ('super_admin', 'school_admin', 'principal', 'teacher', 'student'));
