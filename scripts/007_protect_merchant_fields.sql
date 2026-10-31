-- ============================================================
-- Protect sensitive merchant fields from the browser
--
-- Signed-in merchants can update their own row (business name, logo,
-- reward settings, ...). These fields must only be set by the server:
--   * Google ownership verification (verified flag, place, location, match type)
--   * The Google business list and Google tokens fetched at sign-in
--   * Billing / paid-plan status (is_provisioned, subscription, customer ids)
--
-- Updates made from the browser ("authenticated" role) keep the old value
-- for these fields. Verification may still be *cleared* (Disconnect).
-- The server uses the service role, which this trigger lets through.
--
-- Safe to run more than once.
-- ============================================================

create or replace function public.protect_merchant_fields()
returns trigger
language plpgsql
as $$
begin
  -- Only restrict requests made with a user's session (the browser)
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Ownership verification: may be cleared, never set or changed
  if new.google_ownership_verified is true and old.google_ownership_verified is distinct from true then
    new.google_ownership_verified := old.google_ownership_verified;
  end if;
  if new.google_ownership_verified_at is not null and new.google_ownership_verified_at is distinct from old.google_ownership_verified_at then
    new.google_ownership_verified_at := old.google_ownership_verified_at;
  end if;
  if new.google_verified_place_id is not null and new.google_verified_place_id is distinct from old.google_verified_place_id then
    new.google_verified_place_id := old.google_verified_place_id;
  end if;
  if new.google_verified_location_id is not null and new.google_verified_location_id is distinct from old.google_verified_location_id then
    new.google_verified_location_id := old.google_verified_location_id;
  end if;
  if new.google_location_id is not null and new.google_location_id is distinct from old.google_location_id then
    new.google_location_id := old.google_location_id;
  end if;
  if new.google_match_type is not null and new.google_match_type is distinct from old.google_match_type then
    new.google_match_type := old.google_match_type;
  end if;

  -- Data only Google (via the server) provides
  new.google_managed_businesses := old.google_managed_businesses;
  new.google_access_token := old.google_access_token;
  new.google_refresh_token := old.google_refresh_token;

  -- Billing
  new.is_provisioned := old.is_provisioned;
  new.subscription_status := old.subscription_status;
  new.square_customer_id := old.square_customer_id;
  new.stripe_customer_id := old.stripe_customer_id;

  return new;
end;
$$;

drop trigger if exists protect_merchant_fields on public.merchants;
create trigger protect_merchant_fields
  before update on public.merchants
  for each row execute function public.protect_merchant_fields();
