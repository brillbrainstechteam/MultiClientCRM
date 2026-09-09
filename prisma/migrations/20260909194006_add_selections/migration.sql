-- CreateTable
CREATE TABLE "CrmSelection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmSelectionItem" (
    "id" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "catalogueItemId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "CrmSelectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmSelection_tenantId_idx" ON "CrmSelection"("tenantId");

-- CreateIndex
CREATE INDEX "CrmSelection_tenantId_status_idx" ON "CrmSelection"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CrmSelectionItem_selectionId_idx" ON "CrmSelectionItem"("selectionId");

-- AddForeignKey
ALTER TABLE "CrmSelectionItem" ADD CONSTRAINT "CrmSelectionItem_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "CrmSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
