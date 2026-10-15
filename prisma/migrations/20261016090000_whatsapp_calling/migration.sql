-- WhatsApp Calling (Part 2 §5). Purely additive: four new tables, no change to
-- any existing column, so it is safe to apply to a live database.

CREATE TABLE "WhatsAppCall" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "waCallId" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactId" TEXT,
    "conversationId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ringing',
    "terminateReason" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "assigneeUserId" TEXT,
    "answeredByUserId" TEXT,
    "ringingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "sourcePayload" TEXT,
    "recordingStatus" TEXT,
    "recordingFileId" TEXT,
    "transcriptStatus" TEXT,
    "transcript" JSONB,
    "transcriptLang" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppCall_waCallId_key" ON "WhatsAppCall"("waCallId");
CREATE INDEX "WhatsAppCall_tenantId_status_idx" ON "WhatsAppCall"("tenantId", "status");
CREATE INDEX "WhatsAppCall_tenantId_contactPhone_idx" ON "WhatsAppCall"("tenantId", "contactPhone");
CREATE INDEX "WhatsAppCall_conversationId_idx" ON "WhatsAppCall"("conversationId");
CREATE INDEX "WhatsAppCall_tenantId_ringingAt_idx" ON "WhatsAppCall"("tenantId", "ringingAt");

CREATE TABLE "WhatsAppCallEvent" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppCallEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsAppCallEvent_callId_at_idx" ON "WhatsAppCallEvent"("callId", "at");

ALTER TABLE "WhatsAppCallEvent" ADD CONSTRAINT "WhatsAppCallEvent_callId_fkey"
    FOREIGN KEY ("callId") REFERENCES "WhatsAppCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WhatsAppCallPermission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'none',
    "permissionType" TEXT,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "lastRequestedAt" TIMESTAMP(3),
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "requestedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCallPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppCallPermission_phoneNumberId_contactPhone_key"
    ON "WhatsAppCallPermission"("phoneNumberId", "contactPhone");
CREATE INDEX "WhatsAppCallPermission_tenantId_status_idx" ON "WhatsAppCallPermission"("tenantId", "status");

CREATE TABLE "WhatsAppCallingSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "callIconVisible" BOOLEAN NOT NULL DEFAULT true,
    "inboundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "outboundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "businessHours" JSONB,
    "holidays" JSONB,
    "afterHoursBehaviour" TEXT NOT NULL DEFAULT 'voicemail',
    "afterHoursMessage" TEXT,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recordingConsentText" TEXT,
    "recordingRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "transcriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metaCallingStatus" TEXT,
    "restrictionReason" TEXT,
    "callQuality" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCallingSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppCallingSettings_phoneNumberId_key" ON "WhatsAppCallingSettings"("phoneNumberId");
CREATE INDEX "WhatsAppCallingSettings_tenantId_idx" ON "WhatsAppCallingSettings"("tenantId");
