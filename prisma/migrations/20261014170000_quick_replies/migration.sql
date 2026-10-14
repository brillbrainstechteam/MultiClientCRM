-- Team-wide canned replies, replacing the fixture list the inbox was reading.
-- The WhatsApp Business app keeps quick replies on one device and caps them at
-- 50; stored here they are shared, survive a device change, and are countable.
CREATE TABLE IF NOT EXISTS "CrmQuickReply" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shortcut" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'General',
  "language" TEXT NOT NULL DEFAULT 'en',
  "scope" TEXT NOT NULL DEFAULT 'workspace',
  "ownerId" TEXT,
  "createdByUserId" TEXT,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmQuickReply_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CrmQuickReply_tenantId_shortcut_key"
  ON "CrmQuickReply"("tenantId", "shortcut");
CREATE INDEX IF NOT EXISTS "CrmQuickReply_tenantId_category_idx"
  ON "CrmQuickReply"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "CrmQuickReply_tenantId_usageCount_idx"
  ON "CrmQuickReply"("tenantId", "usageCount");
