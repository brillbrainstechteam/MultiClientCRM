-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "zoneId" TEXT;

-- CreateTable
CREATE TABLE "CrmZone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "states" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "memberUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmZone_tenantId_idx" ON "CrmZone"("tenantId");

