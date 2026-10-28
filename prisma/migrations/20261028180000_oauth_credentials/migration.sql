-- Per-tenant OAuth / delegated-access credentials for social connectors.
CREATE TABLE "CrmOAuthCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "connectionId" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'bisu',
    "scopes" TEXT[],
    "businessId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "refreshTokenEnc" TEXT,
    "lastRefreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmOAuthCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmOAuthCredential_tenantId_provider_externalId_key" ON "CrmOAuthCredential"("tenantId", "provider", "externalId");
CREATE INDEX "CrmOAuthCredential_tenantId_provider_idx" ON "CrmOAuthCredential"("tenantId", "provider");
CREATE INDEX "CrmOAuthCredential_connectionId_idx" ON "CrmOAuthCredential"("connectionId");
