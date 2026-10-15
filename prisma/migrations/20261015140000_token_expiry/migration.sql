-- Token expiry, so a 60-day business token cannot kill a connection silently.
--
-- The Facebook Login configuration fixes the token lifetime at creation and it
-- cannot be changed later. With a 60-day token, every customer's connection
-- stops working two months after onboarding, and the first sign is a failed
-- send. Recording the expiry lets a daily job warn while there is still time.
ALTER TABLE "WhatsAppAccount"
  ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tokenCheckedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "WhatsAppAccount_tokenExpiresAt_idx"
  ON "WhatsAppAccount"("tokenExpiresAt");
