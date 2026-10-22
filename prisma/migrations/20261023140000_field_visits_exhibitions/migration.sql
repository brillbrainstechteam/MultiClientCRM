-- PRD §15 Field Visits and §16 Exhibitions. Three new tables, additive only —
-- no existing column is touched, so this is safe on live data.

CREATE TABLE "CrmFieldVisit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "zoneId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "visitedAt" TIMESTAMP(3),
    "purpose" TEXT,
    "catalogueItemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "itemsPresented" TEXT,
    "expenseAmount" DOUBLE PRECISION,
    "expenseCurrency" TEXT NOT NULL DEFAULT 'INR',
    "expenseNote" TEXT,
    "outcome" TEXT,
    "expectedGrams" DOUBLE PRECISION,
    "actualGrams" DOUBLE PRECISION,
    "discussion" TEXT,
    "orderId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmFieldVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmFieldVisit_tenantId_status_idx" ON "CrmFieldVisit"("tenantId", "status");
CREATE INDEX "CrmFieldVisit_tenantId_contactId_idx" ON "CrmFieldVisit"("tenantId", "contactId");
CREATE INDEX "CrmFieldVisit_tenantId_assigneeUserId_idx" ON "CrmFieldVisit"("tenantId", "assigneeUserId");
CREATE INDEX "CrmFieldVisit_tenantId_plannedAt_idx" ON "CrmFieldVisit"("tenantId", "plannedAt");

CREATE TABLE "CrmExhibition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT,
    "city" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmExhibition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmExhibition_tenantId_status_idx" ON "CrmExhibition"("tenantId", "status");
CREATE INDEX "CrmExhibition_tenantId_startsAt_idx" ON "CrmExhibition"("tenantId", "startsAt");

CREATE TABLE "CrmExhibitionContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "captureSource" TEXT NOT NULL DEFAULT 'manual',
    "cardFileId" TEXT,
    "rawCapture" TEXT,
    "journeyStatus" TEXT NOT NULL DEFAULT 'captured',
    "channelsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "volumeGrams" DOUBLE PRECISION,
    "routeToCalling" BOOLEAN NOT NULL DEFAULT true,
    "routeToVisit" BOOLEAN NOT NULL DEFAULT false,
    "zoneId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmExhibitionContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmExhibitionContact_exhibitionId_contactId_key" ON "CrmExhibitionContact"("exhibitionId", "contactId");
CREATE INDEX "CrmExhibitionContact_tenantId_journeyStatus_idx" ON "CrmExhibitionContact"("tenantId", "journeyStatus");
CREATE INDEX "CrmExhibitionContact_exhibitionId_idx" ON "CrmExhibitionContact"("exhibitionId");

ALTER TABLE "CrmExhibitionContact" ADD CONSTRAINT "CrmExhibitionContact_exhibitionId_fkey"
    FOREIGN KEY ("exhibitionId") REFERENCES "CrmExhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
