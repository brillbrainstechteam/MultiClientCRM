-- Consent proof on the contact. `consent` already holds the decision; these
-- carry how it was collected, when, and the wording the customer agreed to.
-- `consentRequestedAt` is what separates "asked, waiting" from "never asked".
ALTER TABLE "CrmContact"
  ADD COLUMN IF NOT EXISTS "consentOptOutAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentOptOutReason" TEXT,
  ADD COLUMN IF NOT EXISTS "consentRequestedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentRequestWaId" TEXT,
  ADD COLUMN IF NOT EXISTS "consentWording" TEXT;

-- Append-only consent ledger: the evidence trail behind every decision.
CREATE TABLE IF NOT EXISTS "CrmConsentEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "source" TEXT,
  "wording" TEXT,
  "actorId" TEXT,
  "waMessageId" TEXT,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CrmConsentEvent_tenantId_contactId_at_idx"
  ON "CrmConsentEvent"("tenantId", "contactId", "at");
CREATE INDEX IF NOT EXISTS "CrmConsentEvent_tenantId_event_at_idx"
  ON "CrmConsentEvent"("tenantId", "event", "at");
