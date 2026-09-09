-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "assigneeUserId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open';

-- AlterTable
ALTER TABLE "CrmCampaign" ADD COLUMN     "triggerEvent" TEXT,
ADD COLUMN     "triggerKeyword" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teamFunction" TEXT;

-- CreateTable
CREATE TABLE "CrmAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmAuditLog_tenantId_at_idx" ON "CrmAuditLog"("tenantId", "at");

-- CreateIndex
CREATE INDEX "CrmAuditLog_tenantId_actorId_idx" ON "CrmAuditLog"("tenantId", "actorId");
