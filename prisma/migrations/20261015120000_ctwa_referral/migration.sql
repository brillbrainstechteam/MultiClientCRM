-- Click-to-WhatsApp attribution.
--
-- An inbound message from a CTWA ad carries a `referral` object on the ordinary
-- messages webhook. We were discarding it entirely, so every ad-driven lead
-- arrived looking identical to a walk-in and the ad spend could not be tied to
-- a single customer.

-- Verbatim on the message: Meta has added fields over time (ctwa_clid came
-- later), and attribution cannot be reconstructed after the fact.
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "referral" JSONB;

-- Columns on the contact, because these are filters and report dimensions
-- rather than a payload to read back.
ALTER TABLE "CrmContact"
  ADD COLUMN IF NOT EXISTS "adSourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "adSourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "adSourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "adHeadline" TEXT,
  ADD COLUMN IF NOT EXISTS "ctwaClid" TEXT,
  ADD COLUMN IF NOT EXISTS "adReferralAt" TIMESTAMP(3);

-- "Show me everyone from this ad" is the query this exists to answer.
CREATE INDEX IF NOT EXISTS "CrmContact_tenantId_adSourceId_idx"
  ON "CrmContact"("tenantId", "adSourceId");
