-- Lead Source Connections registry (multi WhatsApp / Facebook / Instagram / …).
CREATE TABLE "CrmSourceConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "parentConnectionId" TEXT,
    "enabledSources" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "authStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastEventAt" TIMESTAMP(3),
    "lastError" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmSourceConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmSourceConnection_tenantId_provider_idx" ON "CrmSourceConnection"("tenantId", "provider");
CREATE INDEX "CrmSourceConnection_tenantId_status_idx" ON "CrmSourceConnection"("tenantId", "status");
CREATE INDEX "CrmSourceConnection_tenantId_parentConnectionId_idx" ON "CrmSourceConnection"("tenantId", "parentConnectionId");

-- Marketing → Sales qualification handoff (B2B).
ALTER TABLE "CrmIntakeEvent" ADD COLUMN "qualifiedAt" TIMESTAMP(3);
ALTER TABLE "CrmIntakeEvent" ADD COLUMN "qualifiedByUserId" TEXT;
