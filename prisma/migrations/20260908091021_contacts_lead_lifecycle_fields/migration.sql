-- AlterTable
ALTER TABLE "CrmContact" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "businessValue" TEXT,
ADD COLUMN     "consentOptInAt" TIMESTAMP(3),
ADD COLUMN     "consentOptInSource" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "createdSource" TEXT,
ADD COLUMN     "customerType" TEXT NOT NULL DEFAULT 'b2b',
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "leadStatus" TEXT NOT NULL DEFAULT 'new',
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "lifecycleStage" TEXT NOT NULL DEFAULT 'prospect',
ADD COLUMN     "lifecycleState" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "productInterests" TEXT[],
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zone" TEXT;

-- CreateTable
CREATE TABLE "CrmStageTransition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT NOT NULL,
    "byUserId" TEXT,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmStageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmStageTransition_tenantId_contactId_idx" ON "CrmStageTransition"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "CrmContact_tenantId_leadStatus_idx" ON "CrmContact"("tenantId", "leadStatus");

-- CreateIndex
CREATE INDEX "CrmContact_tenantId_lifecycleStage_idx" ON "CrmContact"("tenantId", "lifecycleStage");
