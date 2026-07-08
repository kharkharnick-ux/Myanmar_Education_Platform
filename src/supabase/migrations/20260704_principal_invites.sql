-- Principal invitation and registration support.
-- Run this migration before using the Principal Management flow.

alter table public.registration_requests
  add column if not exists invite_token text,
  add column if not exists invite_token_expires_at timestamptz,
  add column if not exists invited_by uuid references public.profiles(id),
  add column if not exists invite_note text,
  add column if not exists highest_education text,
  add column if not exists major text,
  add column if not exists years_of_teaching_experience integer,
  add column if not exists years_of_management_experience integer,
  add column if not exists previous_school text,
  add column if not exists current_position text,
  add column if not exists profile_photo_url text,
  add column if not exists degree_certificate_url text,
  add column if not exists teaching_license_url text,
  add column if not exists appointment_letter_url text,
  add column if not exists resume_url text,
  add column if not exists recommendation_letter_url text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists emergency_contact_phone text;

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
      and pg_get_constraintdef(oid) ilike '%pending%'
      and pg_get_constraintdef(oid) ilike '%approved%'
      and pg_get_constraintdef(oid) ilike '%rejected%'
  loop
    execute format('alter table public.registration_requests drop constraint %I', constraint_record.conname);
  end loop;
end $$;

alter table public.registration_requests
  add constraint registration_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'invited'));

create unique index if not exists registration_requests_principal_invite_token_key
  on public.registration_requests(invite_token)
  where request_type = 'principal' and invite_token is not null;

create index if not exists registration_requests_principal_school_status_idx
  on public.registration_requests(approved_school_id, status)
  where request_type = 'principal';

alter table public.teachers
  add column if not exists profile_id uuid references public.profiles(id),
  add column if not exists level text,
  add column if not exists status text default 'active',
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists updated_at timestamptz;

create unique index if not exists teachers_one_principal_per_school_idx
  on public.teachers(school_id)
  where level = 'principal' and status = 'active';
