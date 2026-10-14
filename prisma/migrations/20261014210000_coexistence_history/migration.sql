-- Coexistence: connection mode, and the one-time contacts/history sync state.
--
-- Meta gives a single 24-hour window after onboarding to request each sync, and
-- each may be requested only once. Missing it means the customer must offboard
-- and repeat Embedded Signup, so the state is stored rather than inferred.
ALTER TABLE "WhatsAppAccount"
  ADD COLUMN IF NOT EXISTS "connectionMode" TEXT NOT NULL DEFAULT 'new_cloud_api',
  ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "historyPermission" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "historySyncStatus" TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS "historyRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "historyStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "historyCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "historyPhase" INTEGER,
  ADD COLUMN IF NOT EXISTS "historyProgress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "historyMessages" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "historyThreads" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "historyMediaPlaceholders" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "historyError" TEXT,
  ADD COLUMN IF NOT EXISTS "contactsSyncStatus" TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS "contactsRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "contactsImported" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "contactsSyncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "contactsError" TEXT;

-- Existing coexistence connections keep their mode; everything else is a plain
-- Cloud API number. The strategy recorded during onboarding is the only signal.
UPDATE "WhatsAppAccount" a
   SET "connectionMode" = 'coexistence'
  FROM "OnboardingSession" s
 WHERE s."tenantId" = a."tenantId"
   AND s."strategy" = 'coexistence'
   AND a."connectionMode" = 'new_cloud_api';

-- Backfilled threads are context, not work: they stay out of the Open queue
-- until a live message arrives.
ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "isHistorical" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "historyFrom" TIMESTAMP(3);

-- Where each message came from, and whether its media is still retrievable.
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS "isHistorical" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mediaUnavailable" BOOLEAN NOT NULL DEFAULT false;

-- Existing rows predate the column: outbound was always sent from the CRM.
UPDATE "Message" SET "source" = 'crm_agent' WHERE "direction" = 'outbound' AND "source" = 'customer';

CREATE INDEX IF NOT EXISTS "Message_conversationId_at_idx" ON "Message"("conversationId", "at");
