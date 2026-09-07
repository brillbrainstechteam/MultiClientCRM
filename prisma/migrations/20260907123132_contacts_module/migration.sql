-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "area" TEXT,
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "branch" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessValue" TEXT,
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentSource" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "customerType" TEXT,
ADD COLUMN     "firstInteractionAt" TIMESTAMP(3),
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "importSource" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "leadStatus" TEXT NOT NULL DEFAULT 'new',
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "lifecycleStage" TEXT NOT NULL DEFAULT 'prospect',
ADD COLUMN     "marketingOwnerId" TEXT,
ADD COLUMN     "optedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "productInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "relationshipState" TEXT,
ADD COLUMN     "salesOwnerId" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'b2c',
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "businessModel" TEXT NOT NULL DEFAULT 'both';

-- CreateTable
CREATE TABLE "ContactActivity" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "meta" JSONB,
    "byUserId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageTransition" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "reason" TEXT,
    "byUserId" TEXT,
    "automated" BOOLEAN NOT NULL DEFAULT false,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'dynamic',
    "rules" JSONB,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactActivity_contactId_idx" ON "ContactActivity"("contactId");

-- CreateIndex
CREATE INDEX "ContactActivity_tenantId_idx" ON "ContactActivity"("tenantId");

-- CreateIndex
CREATE INDEX "StageTransition_contactId_idx" ON "StageTransition"("contactId");

-- CreateIndex
CREATE INDEX "StageTransition_tenantId_idx" ON "StageTransition"("tenantId");

-- CreateIndex
CREATE INDEX "Segment_tenantId_idx" ON "Segment"("tenantId");

-- CreateIndex
CREATE INDEX "Contact_tenantId_leadStatus_idx" ON "Contact"("tenantId", "leadStatus");

-- CreateIndex
CREATE INDEX "Contact_tenantId_lifecycleStage_idx" ON "Contact"("tenantId", "lifecycleStage");

-- CreateIndex
CREATE INDEX "Contact_tenantId_type_idx" ON "Contact"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Contact_tenantId_salesOwnerId_idx" ON "Contact"("tenantId", "salesOwnerId");

-- AddForeignKey
ALTER TABLE "ContactActivity" ADD CONSTRAINT "ContactActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageTransition" ADD CONSTRAINT "StageTransition_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

