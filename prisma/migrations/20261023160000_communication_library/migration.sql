-- PRD §17 Communication Library. One new table, additive.

CREATE TABLE "CrmLibraryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "fileId" TEXT,
    "linkUrl" TEXT,
    "catalogueItemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "templateId" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT NOT NULL DEFAULT 'en',
    "isOwnerContent" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'workspace',
    "ownerId" TEXT,
    "createdByUserId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLibraryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmLibraryItem_tenantId_active_idx" ON "CrmLibraryItem"("tenantId", "active");
CREATE INDEX "CrmLibraryItem_tenantId_audience_idx" ON "CrmLibraryItem"("tenantId", "audience");
CREATE INDEX "CrmLibraryItem_tenantId_kind_idx" ON "CrmLibraryItem"("tenantId", "kind");
