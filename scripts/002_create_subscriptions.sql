-- Create subscriptions table to track Stripe subscription state
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('active','past_due','canceled','incomplete','trialing','unpaid')),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add subscription_status to merchants for quick access checks in middleware
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active'
    CHECK (subscription_status IN ('active','past_due','canceled','incomplete','trialing','unpaid'));

-- Add stripe_customer_id to merchants for Stripe lookup
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Merchant can read their own subscriptions
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = merchant_id);

-- Only service role (webhook handler) can insert/update subscriptions
-- Authenticated users cannot directly modify subscriptions
CREATE POLICY "subscriptions_service_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (false);

CREATE POLICY "subscriptions_service_update" ON public.subscriptions
  FOR UPDATE USING (false);

-- Create index for fast lookups by stripe_subscription_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id
  ON public.subscriptions(stripe_subscription_id);

-- Create index for merchant_id lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_merchant_id
  ON public.subscriptions(merchant_id);
