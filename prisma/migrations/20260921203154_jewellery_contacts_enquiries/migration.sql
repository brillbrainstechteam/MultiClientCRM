-- AlterTable
ALTER TABLE "CrmContact" ADD COLUMN     "businessSegment" TEXT,
ADD COLUMN     "clientCode" TEXT,
ADD COLUMN     "companyAnniversary" TIMESTAMP(3),
ADD COLUMN     "dataVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "inBroadcastList" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inCommunity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interestedIn" TEXT,
ADD COLUMN     "introCallDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jewelleryProfile" JSONB,
ADD COLUMN     "kamUserId" TEXT,
ADD COLUMN     "lastConnectAt" TIMESTAMP(3),
ADD COLUMN     "lastFeedback" TEXT,
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "officeVisitDone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "CrmEnquiry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT,
    "conversationId" TEXT,
    "enquiryNo" TEXT NOT NULL,
    "source" TEXT,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "product" TEXT,
    "design" TEXT,
    "weightRange" TEXT,
    "sizeLength" TEXT,
    "pcs" INTEGER,
    "tentativeWeight" TEXT,
    "description" TEXT,
    "imagesSentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remarks" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmEnquiry_tenantId_status_idx" ON "CrmEnquiry"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CrmEnquiry_tenantId_contactId_idx" ON "CrmEnquiry"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "CrmEnquiry_conversationId_idx" ON "CrmEnquiry"("conversationId");

-- CreateIndex
CREATE INDEX "CrmContact_tenantId_nextFollowUpAt_idx" ON "CrmContact"("tenantId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "CrmContact_tenantId_businessSegment_idx" ON "CrmContact"("tenantId", "businessSegment");

