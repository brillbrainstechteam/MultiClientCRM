-- Saved, not-yet-submitted template drafts (resume later).
CREATE TABLE "CrmTemplateDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmTemplateDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrmTemplateDraft_tenantId_updatedAt_idx" ON "CrmTemplateDraft"("tenantId", "updatedAt");
