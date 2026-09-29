-- CreateTable
CREATE TABLE "CrmFile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'showroom',
    "driver" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmFile_tenantId_contactId_idx" ON "CrmFile"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "CrmFile_tenantId_kind_idx" ON "CrmFile"("tenantId", "kind");

