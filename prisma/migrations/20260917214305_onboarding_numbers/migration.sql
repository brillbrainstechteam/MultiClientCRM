-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "businessModel" SET DEFAULT 'b2b';

-- AlterTable
ALTER TABLE "WhatsAppAccount" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "codeVerificationStatus" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "messagingTier" TEXT,
ADD COLUMN     "qualityRating" TEXT,
ADD COLUMN     "qualitySyncedAt" TIMESTAMP(3),
ADD COLUMN     "twoStepPin" TEXT;

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'started',
    "strategy" TEXT,
    "lastStep" TEXT,
    "wabaId" TEXT,
    "phoneNumberId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingSession_tenantId_idx" ON "OnboardingSession"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingSession_tenantId_key" ON "OnboardingSession"("tenantId");

-- AddForeignKey
ALTER TABLE "OnboardingSession" ADD CONSTRAINT "OnboardingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

