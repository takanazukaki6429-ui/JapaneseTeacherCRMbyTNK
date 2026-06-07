-- Add Stripe subscription fields to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS is_free          boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id      text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  text,
  ADD COLUMN IF NOT EXISTS subscription_status     text     NOT NULL DEFAULT 'inactive';

-- Index for Stripe customer lookup (webhook処理で使用)
CREATE INDEX IF NOT EXISTS idx_user_settings_stripe_customer
  ON user_settings(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN user_settings.is_free IS '無償ユーザーフラグ。trueの場合はサブスク不要で全機能利用可';
COMMENT ON COLUMN user_settings.subscription_status IS 'inactive | active | canceled | past_due | trialing';
