-- ============================================================
-- When a business finished setup.
--
-- Connecting a Google business happens on step 2 of setup; the dashboard
-- should only open once the owner has gone through every step. The server
-- sets onboarding_completed_at on the last step. Businesses that were
-- already set up before this change count as finished.
--
-- Only the server can set it (browser updates keep the old value).
-- Safe to run more than once.
-- ============================================================

alter table public.merchants add column if not exists onboarding_completed_at timestamptz;

-- Existing, fully set-up businesses keep their dashboard access
update public.merchants
set onboarding_completed_at = coalesce(updated_at, now())
where onboarding_completed_at is null
  and google_ownership_verified is true
  and coalesce(trim(business_name), '') <> '';

create or replace function public.protect_onboarding_completed()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.onboarding_completed_at := old.onboarding_completed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_onboarding_completed on public.merchants;
create trigger protect_onboarding_completed
  before update on public.merchants
  for each row execute function public.protect_onboarding_completed();
