-- CreateTable
CREATE TABLE "CrmPlanEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'campaign',
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmPlanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmPlanEvent_tenantId_date_idx" ON "CrmPlanEvent"("tenantId", "date");

