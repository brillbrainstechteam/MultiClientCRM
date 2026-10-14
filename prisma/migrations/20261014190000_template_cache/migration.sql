-- Local mirror of the WABA's templates. Meta stays the system of record; this
-- removes a Graph call from every page load and gives the webhook somewhere to
-- write status, category and quality changes the moment they arrive.
CREATE TABLE IF NOT EXISTS "CrmTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "wabaId" TEXT NOT NULL,
  "metaTemplateId" TEXT,
  "name" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "qualityScore" TEXT,
  "rejectedReason" TEXT,
  "components" JSONB NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmTemplate_pkey" PRIMARY KEY ("id")
);

-- A template is identified by name + language within a WABA; the same name in
-- another language is a separate template and counts separately against Meta's
-- per-WABA limit.
CREATE UNIQUE INDEX IF NOT EXISTS "CrmTemplate_tenantId_name_language_key"
  ON "CrmTemplate"("tenantId", "name", "language");
CREATE INDEX IF NOT EXISTS "CrmTemplate_tenantId_status_idx" ON "CrmTemplate"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "CrmTemplate_tenantId_category_idx" ON "CrmTemplate"("tenantId", "category");
CREATE INDEX IF NOT EXISTS "CrmTemplate_tenantId_deletedAt_idx" ON "CrmTemplate"("tenantId", "deletedAt");
