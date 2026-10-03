-- CreateTable
CREATE TABLE "CrmImportJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Import',
    "fileName" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmImportJob_tenantId_createdAt_idx" ON "CrmImportJob"("tenantId", "createdAt");

