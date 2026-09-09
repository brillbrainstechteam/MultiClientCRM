-- CreateTable
CREATE TABLE "CrmCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'broadcast',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "templateId" TEXT,
    "templateName" TEXT,
    "templateLocale" TEXT,
    "whatsappNumberId" TEXT,
    "segmentId" TEXT,
    "audienceFilter" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT,
    "mobile" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "waMessageId" TEXT,
    "error" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAutomationRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTelephonyConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "connectedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTelephonyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCallLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT,
    "mobile" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "provider" TEXT,
    "providerCallId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "startedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "disposition" TEXT,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmCampaign_tenantId_idx" ON "CrmCampaign"("tenantId");

-- CreateIndex
CREATE INDEX "CrmCampaign_tenantId_status_idx" ON "CrmCampaign"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CrmCampaignRecipient_campaignId_idx" ON "CrmCampaignRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "CrmCampaignRecipient_tenantId_mobile_idx" ON "CrmCampaignRecipient"("tenantId", "mobile");

-- CreateIndex
CREATE INDEX "CrmAutomationRule_tenantId_idx" ON "CrmAutomationRule"("tenantId");

-- CreateIndex
CREATE INDEX "CrmAutomationRule_tenantId_trigger_idx" ON "CrmAutomationRule"("tenantId", "trigger");

-- CreateIndex
CREATE UNIQUE INDEX "CrmTelephonyConnection_tenantId_key" ON "CrmTelephonyConnection"("tenantId");

-- CreateIndex
CREATE INDEX "CrmCallLog_tenantId_idx" ON "CrmCallLog"("tenantId");

-- CreateIndex
CREATE INDEX "CrmCallLog_tenantId_contactId_idx" ON "CrmCallLog"("tenantId", "contactId");

-- AddForeignKey
ALTER TABLE "CrmCampaignRecipient" ADD CONSTRAINT "CrmCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CrmCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
