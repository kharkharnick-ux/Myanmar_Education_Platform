-- Permanently delete incomplete Principal registration request rows only.
--
-- Safety scope:
-- - Touches only public.registration_requests.
-- - Does not touch school_admin records, schools, regions, townships, profiles, or auth users.
-- - Does not delete storage.objects. Uploaded files, if any, must be reviewed separately.
--
-- Preview first:
-- select id, email, status, approved_school_id, created_at, updated_at
-- from public.registration_requests
-- where request_type = 'principal'
--   and (
--     (
--       status = 'pending'
--       and (
--         nullif(btrim(coalesce(email, '')), '') is null
--         or nullif(btrim(coalesce(full_name_mm, '')), '') is null
--         or nullif(btrim(coalesce(full_name_en, '')), '') is null
--         or nullif(btrim(coalesce(phone, '')), '') is null
--         or date_of_birth is null
--         or nullif(btrim(coalesce(gender, '')), '') is null
--         or nullif(btrim(coalesce(nrc_number, '')), '') is null
--         or nullif(btrim(coalesce(residential_address, '')), '') is null
--         or nullif(btrim(coalesce(highest_education, '')), '') is null
--         or years_of_teaching_experience is null
--         or years_of_teaching_experience < 0
--         or years_of_management_experience is null
--         or years_of_management_experience < 0
--         or nullif(btrim(coalesce(nrc_front_url, '')), '') is null
--         or nullif(btrim(coalesce(nrc_back_url, '')), '') is null
--       )
--     )
--     or (
--       status = 'invited'
--       and (
--         nullif(btrim(coalesce(email, '')), '') is null
--         or approved_school_id is null
--         or invite_token is null
--         or full_name_mm = 'Invited Principal'
--         or full_name_en = 'Invited Principal'
--       )
--     )
--   );

begin;

delete from public.registration_requests
where request_type = 'principal'
  and (
    (
      status = 'pending'
      and (
        nullif(btrim(coalesce(email, '')), '') is null
        or nullif(btrim(coalesce(full_name_mm, '')), '') is null
        or nullif(btrim(coalesce(full_name_en, '')), '') is null
        or nullif(btrim(coalesce(phone, '')), '') is null
        or date_of_birth is null
        or nullif(btrim(coalesce(gender, '')), '') is null
        or nullif(btrim(coalesce(nrc_number, '')), '') is null
        or nullif(btrim(coalesce(residential_address, '')), '') is null
        or nullif(btrim(coalesce(highest_education, '')), '') is null
        or years_of_teaching_experience is null
        or years_of_teaching_experience < 0
        or years_of_management_experience is null
        or years_of_management_experience < 0
        or nullif(btrim(coalesce(nrc_front_url, '')), '') is null
        or nullif(btrim(coalesce(nrc_back_url, '')), '') is null
      )
    )
    or (
      status = 'invited'
      and (
        nullif(btrim(coalesce(email, '')), '') is null
        or approved_school_id is null
        or invite_token is null
        or full_name_mm = 'Invited Principal'
        or full_name_en = 'Invited Principal'
      )
    )
  );

commit;
